"""
Classical Particle Swarm Optimization (PSO) for VRP.

Implements genuine classical PSO with velocity-based position update.
Uses standard velocity equation: V(t+1) = w*V(t) + c1*r1*(pbest-X) + c2*r2*(gbest-X)
"""

import numpy as np
from typing import Dict, Tuple
import time

from ..core.problem import VRPInstance
from ..core.solution import VRPSolution
from ..core.decoder import spv_decoder, route_decoder
from ..core.repair import repair_solution
from ..core.fitness import evaluate_solution


class PSO:
    """
    Classical Particle Swarm Optimization for VRP.
    
    Uses velocity-based position update:
    V(t+1) = w*V(t) + c1*r1*(pbest-X) + c2*r2*(gbest-X)
    X(t+1) = X(t) + V(t+1)
    """
    
    def __init__(
        self,
        instance: VRPInstance,
        swarm_size: int = 25,
        max_iterations: int = 200,
        w: float = 0.7,
        c1: float = 1.5,
        c2: float = 1.5,
        early_stop: int = 20,
        seed: int = 42
    ):
        """
        Initialize PSO algorithm.
        
        Args:
            instance: VRP problem instance
            swarm_size: Number of particles
            max_iterations: Maximum iterations
            w: Inertia weight
            c1: Cognitive coefficient (personal best)
            c2: Social coefficient (global best)
            early_stop: Stop if no improvement for this many iterations
            seed: Random seed for reproducibility
        """
        self.instance = instance
        self.swarm_size = swarm_size
        self.max_iterations = max_iterations
        self.w = w
        self.c1 = c1
        self.c2 = c2
        self.early_stop = early_stop
        self.seed = seed
        
        np.random.seed(seed)
        
        # Algorithm state
        self.positions = None
        self.velocities = None
        self.pbest_positions = None
        self.pbest_fitness = None
        self.gbest_position = None
        self.gbest_fitness = float('inf')
        self.gbest_solution = None
        
        # Convergence tracking
        self.best_fitness_history = []
        self.mean_fitness_history = []
        
        # Metrics
        self.function_evaluations = 0
        self.runtime = 0.0
        self.convergence_iteration = max_iterations
    
    def initialize_swarm(self):
        """Initialize particle positions and velocities."""
        n_customers = self.instance.num_customers
        
        # Initialize positions in [-1, 1] range
        self.positions = np.random.uniform(-1.0, 1.0, (self.swarm_size, n_customers))
        
        # Initialize velocities in [-0.5, 0.5] range
        self.velocities = np.random.uniform(-0.5, 0.5, (self.swarm_size, n_customers))
        
        # Initialize personal bests
        self.pbest_positions = self.positions.copy()
        self.pbest_fitness = np.full(self.swarm_size, float('inf'))
        
        # Evaluate initial population
        for i in range(self.swarm_size):
            fitness, solution = self._evaluate_particle(self.positions[i])
            self.pbest_fitness[i] = fitness
            self.pbest_positions[i] = self.positions[i].copy()
            
            if fitness < self.gbest_fitness:
                self.gbest_fitness = fitness
                self.gbest_position = self.positions[i].copy()
                self.gbest_solution = solution
        
        self.best_fitness_history.append(self.gbest_fitness)
        self.mean_fitness_history.append(np.mean(self.pbest_fitness))
    
    def _evaluate_particle(self, position: np.ndarray) -> Tuple[float, VRPSolution]:
        """
        Evaluate a particle position.
        
        Args:
            position: Continuous particle position
        
        Returns:
            Tuple of (fitness, solution)
        """
        self.function_evaluations += 1
        
        # Decode continuous position to permutation
        permutation = spv_decoder(position)
        
        # Decode permutation to routes
        solution = route_decoder(permutation, self.instance, use_capacity_constraints=True)
        
        # Repair if needed
        if not solution.feasible:
            solution = repair_solution(solution, self.instance)
        
        # Evaluate fitness
        result = evaluate_solution(solution, self.instance)
        
        return result['fitness'], solution
    
    def velocity_update(self) -> np.ndarray:
        """
        Perform velocity update for all particles.
        
        V(t+1) = w*V(t) + c1*r1*(pbest-X) + c2*r2*(gbest-X)
        
        Returns:
            Updated velocities
        """
        r1 = np.random.rand(self.swarm_size, self.instance.num_customers)
        r2 = np.random.rand(self.swarm_size, self.instance.num_customers)
        
        # Cognitive component (personal best)
        cognitive = self.c1 * r1 * (self.pbest_positions - self.positions)
        
        # Social component (global best)
        social = self.c2 * r2 * (self.gbest_position - self.positions)
        
        # Velocity update
        new_velocities = self.w * self.velocities + cognitive + social
        
        # Clamp velocities to prevent explosion
        max_velocity = 2.0
        new_velocities = np.clip(new_velocities, -max_velocity, max_velocity)
        
        return new_velocities
    
    def position_update(self) -> np.ndarray:
        """
        Perform position update.
        
        X(t+1) = X(t) + V(t+1)
        
        Returns:
            Updated positions
        """
        new_positions = self.positions + self.velocities
        
        # Clamp positions to reasonable range
        new_positions = np.clip(new_positions, -2.0, 2.0)
        
        return new_positions
    
    def optimize(self) -> Dict:
        """
        Run PSO optimization.
        
        Returns:
            Dictionary containing optimization results
        """
        start_time = time.time()
        
        # Initialize swarm
        self.initialize_swarm()
        
        # Main optimization loop
        stagnant = 0
        
        for iteration in range(self.max_iterations):
            # Velocity update
            self.velocities = self.velocity_update()
            
            # Position update
            self.positions = self.position_update()
            
            # Evaluate new positions
            for i in range(self.swarm_size):
                fitness, solution = self._evaluate_particle(self.positions[i])
                
                # Update personal best
                if fitness < self.pbest_fitness[i]:
                    self.pbest_fitness[i] = fitness
                    self.pbest_positions[i] = self.positions[i].copy()
                    
                    # Update global best
                    if fitness < self.gbest_fitness:
                        self.gbest_fitness = fitness
                        self.gbest_position = self.positions[i].copy()
                        self.gbest_solution = solution
                        stagnant = -1  # Reset stagnation counter
            
            stagnant += 1
            
            # Record history
            self.best_fitness_history.append(self.gbest_fitness)
            self.mean_fitness_history.append(np.mean(self.pbest_fitness))
            
            # Early stopping
            if stagnant >= self.early_stop and iteration > 10:
                self.convergence_iteration = iteration - self.early_stop
                break
        
        self.runtime = time.time() - start_time
        
        # Return results
        return self._get_results()
    
    def _get_results(self) -> Dict:
        """Compile optimization results."""
        # Evaluate final solution
        final_result = evaluate_solution(self.gbest_solution, self.instance)
        
        return {
            'algorithm': 'PSO',
            'best_fitness': self.gbest_fitness,
            'best_solution': self.gbest_solution,
            'fitness_history': self.best_fitness_history,
            'mean_fitness_history': self.mean_fitness_history,
            'convergence_iteration': self.convergence_iteration,
            'runtime': self.runtime,
            'function_evaluations': self.function_evaluations,
            'final_distance': final_result['distance'],
            'final_travel_time': final_result['travel_time'],
            'final_congestion': final_result['congestion'],
            'final_emissions': final_result['emissions'],
            'feasible': final_result['feasible'],
            'constraint_penalty': final_result['constraint_penalty']
        }


def run_pso(
    instance: VRPInstance,
    swarm_size: int = 25,
    max_iterations: int = 200,
    w: float = 0.7,
    c1: float = 1.5,
    c2: float = 1.5,
    early_stop: int = 20,
    seed: int = 42
) -> Dict:
    """
    Convenience function to run PSO.
    
    Args:
        instance: VRP problem instance
        swarm_size: Number of particles
        max_iterations: Maximum iterations
        w: Inertia weight
        c1: Cognitive coefficient
        c2: Social coefficient
        early_stop: Early stopping threshold
        seed: Random seed
    
    Returns:
        Optimization results dictionary
    """
    pso = PSO(
        instance=instance,
        swarm_size=swarm_size,
        max_iterations=max_iterations,
        w=w,
        c1=c1,
        c2=c2,
        early_stop=early_stop,
        seed=seed
    )
    return pso.optimize()