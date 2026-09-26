"""
Quantum Particle Swarm Optimization (QPSO) for VRP.

Implements genuine QPSO with quantum position update using MBEST and beta decay.
DOES NOT use velocity - uses quantum wave function principles.
"""

import numpy as np
from typing import Dict, List, Tuple
import time

from ..core.problem import VRPInstance
from ..core.solution import VRPSolution
from ..core.decoder import spv_decoder, route_decoder
from ..core.repair import repair_solution
from ..core.fitness import evaluate_solution


class QPSO:
    """
    Quantum Particle Swarm Optimization for VRP.
    
    Uses quantum position update without velocity:
    X_i(t+1) = p_i(t) ± beta(t) * |MBEST(t) - X_i(t)| * ln(1/u)
    """
    
    def __init__(
        self,
        instance: VRPInstance,
        swarm_size: int = 25,
        max_iterations: int = 200,
        beta_max: float = 1.0,
        beta_min: float = 0.5,
        early_stop: int = 20,
        seed: int = 42
    ):
        """
        Initialize QPSO algorithm.
        
        Args:
            instance: VRP problem instance
            swarm_size: Number of particles
            max_iterations: Maximum iterations
            beta_max: Maximum beta (expansion/contraction coefficient)
            beta_min: Minimum beta
            early_stop: Stop if no improvement for this many iterations
            seed: Random seed for reproducibility
        """
        self.instance = instance
        self.swarm_size = swarm_size
        self.max_iterations = max_iterations
        self.beta_max = beta_max
        self.beta_min = beta_min
        self.early_stop = early_stop
        self.seed = seed
        
        np.random.seed(seed)
        
        # Algorithm state
        self.positions = None
        self.pbest_positions = None
        self.pbest_fitness = None
        self.gbest_position = None
        self.gbest_fitness = float('inf')
        self.gbest_solution = None
        
        # Convergence tracking
        self.history = []
        self.best_fitness_history = []
        self.mean_fitness_history = []
        
        # Metrics
        self.function_evaluations = 0
        self.runtime = 0.0
        self.convergence_iteration = max_iterations
    
    def initialize_swarm(self):
        """Initialize particle positions randomly."""
        n_customers = self.instance.num_customers
        
        # Initialize positions in [-1, 1] range
        self.positions = np.random.uniform(-1.0, 1.0, (self.swarm_size, n_customers))
        
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
    
    def calculate_mbest(self) -> np.ndarray:
        """
        Calculate MBEST (mean of personal best positions).
        
        MBEST(t) = (1/M) * sum(pbest_i)
        """
        return np.mean(self.pbest_positions, axis=0)
    
    def quantum_position_update(self, iteration: int) -> np.ndarray:
        """
        Perform quantum position update for all particles.
        
        X_i(t+1) = p_i(t) ± beta(t) * |MBEST(t) - X_i(t)| * ln(1/u)
        
        Args:
            iteration: Current iteration number
        
        Returns:
            Updated positions
        """
        # Calculate beta with linear decay
        if self.max_iterations > 1:
            beta = self.beta_max - (self.beta_max - self.beta_min) * iteration / (self.max_iterations - 1)
        else:
            beta = self.beta_min
        
        # Calculate MBEST
        mbest = self.calculate_mbest()
        
        # Generate random numbers
        phi = np.random.rand(self.swarm_size, self.instance.num_customers)
        u = np.random.rand(self.swarm_size, self.instance.num_customers)
        u = np.clip(u, 1e-12, 1.0)  # Prevent log(0)
        
        # Random direction: -1 or +1
        direction = np.where(np.random.rand(self.swarm_size, self.instance.num_customers) < 0.5, -1.0, 1.0)
        
        # Calculate local attractor p_i
        p = phi * self.pbest_positions + (1.0 - phi) * self.gbest_position
        
        # Quantum position update
        new_positions = p + direction * beta * np.abs(mbest - self.positions) * np.log(1.0 / u)
        
        return new_positions
    
    def optimize(self) -> Dict:
        """
        Run QPSO optimization.
        
        Returns:
            Dictionary containing optimization results
        """
        start_time = time.time()
        
        # Initialize swarm
        self.initialize_swarm()
        
        # Main optimization loop
        stagnant = 0
        
        for iteration in range(self.max_iterations):
            # Quantum position update
            self.positions = self.quantum_position_update(iteration)
            
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
            'algorithm': 'QPSO',
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


def run_qpso(
    instance: VRPInstance,
    swarm_size: int = 25,
    max_iterations: int = 200,
    beta_max: float = 1.0,
    beta_min: float = 0.5,
    early_stop: int = 20,
    seed: int = 42
) -> Dict:
    """
    Convenience function to run QPSO.
    
    Args:
        instance: VRP problem instance
        swarm_size: Number of particles
        max_iterations: Maximum iterations
        beta_max: Maximum beta coefficient
        beta_min: Minimum beta coefficient
        early_stop: Early stopping threshold
        seed: Random seed
    
    Returns:
        Optimization results dictionary
    """
    qpso = QPSO(
        instance=instance,
        swarm_size=swarm_size,
        max_iterations=max_iterations,
        beta_max=beta_max,
        beta_min=beta_min,
        early_stop=early_stop,
        seed=seed
    )
    return qpso.optimize()