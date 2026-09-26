"""
Ant Colony Optimization (ACO) for VRP.

Implements proper ACO with pheromone trails, heuristic information,
and pheromone update with evaporation.
"""

import numpy as np
from typing import Dict, List, Tuple
import time

from ..core.problem import VRPInstance
from ..core.solution import VRPSolution
from ..core.decoder import pheromone_decoder, route_decoder
from ..core.repair import repair_solution
from ..core.fitness import evaluate_solution


class AntColonyOptimization:
    """
    Ant Colony Optimization for VRP.
    
    Uses pheromone-based construction with:
    - Pheromone matrix tau[i][j]
    - Heuristic information eta[i][j] = 1/cost(i,j)
    - Transition probability: P(i,j) = tau^alpha * eta^beta / sum
    - Pheromone evaporation and deposit
    """
    
    def __init__(
        self,
        instance: VRPInstance,
        num_ants: int = 30,
        max_iterations: int = 200,
        alpha: float = 1.0,
        beta: float = 2.0,
        evaporation_rate: float = 0.2,
        q0: float = 0.9,
        early_stop: int = 20,
        seed: int = 42
    ):
        """
        Initialize ACO algorithm.
        
        Args:
            instance: VRP problem instance
            num_ants: Number of ants
            max_iterations: Maximum iterations
            alpha: Pheromone importance weight
            beta: Heuristic importance weight
            evaporation_rate: Pheromone evaporation rate (rho)
            q0: Exploitation vs exploration threshold
            early_stop: Stop if no improvement for this many iterations
            seed: Random seed for reproducibility
        """
        self.instance = instance
        self.num_ants = num_ants
        self.max_iterations = max_iterations
        self.alpha = alpha
        self.beta = beta
        self.evaporation_rate = evaporation_rate
        self.q0 = q0
        self.early_stop = early_stop
        self.seed = seed
        
        np.random.seed(seed)
        
        # Pheromone matrix (including depot as node 0)
        n_nodes = self.instance.num_customers + 1
        self.pheromone = np.ones((n_nodes, n_nodes))
        
        # Heuristic matrix (inverse of distance)
        self.heuristic = self._compute_heuristic()
        
        # Algorithm state
        self.best_solution = None
        self.best_fitness = float('inf')
        self.best_iteration = 0
        
        # Convergence tracking
        self.best_fitness_history = []
        self.mean_fitness_history = []
        
        # Metrics
        self.function_evaluations = 0
        self.runtime = 0.0
        self.convergence_iteration = max_iterations
    
    def _compute_heuristic(self) -> np.ndarray:
        """
        Compute heuristic information matrix.
        
        eta[i][j] = 1 / distance(i,j)
        """
        n_nodes = self.instance.num_customers + 1
        heuristic = np.zeros((n_nodes, n_nodes))
        
        for i in range(n_nodes):
            for j in range(n_nodes):
                if i != j:
                    distance = self.instance.get_distance(i, j)
                    heuristic[i, j] = 1.0 / distance if distance > 0 else 0.0
        
        return heuristic
    
    def construct_solution(self) -> Tuple[List[int], VRPSolution]:
        """
        Construct a solution using pheromone and heuristic information.
        
        Returns:
            Tuple of (permutation, solution)
        """
        # Decode using pheromone information
        permutation = pheromone_decoder(
            self.pheromone,
            self.instance,
            alpha=self.alpha,
            beta=self.beta
        )
        
        # Decode permutation to routes
        solution = route_decoder(permutation, self.instance, use_capacity_constraints=True)
        
        # Repair if needed
        if not solution.feasible:
            solution = repair_solution(solution, self.instance)
        
        return permutation, solution
    
    def evaluate_solution(self, solution: VRPSolution) -> float:
        """
        Evaluate a solution and return fitness.
        
        Args:
            solution: VRP solution
        
        Returns:
            Fitness value
        """
        self.function_evaluations += 1
        result = evaluate_solution(solution, self.instance)
        return result['fitness']
    
    def update_pheromone(self, solutions: List[VRPSolution], fitnesses: List[float]):
        """
        Update pheromone matrix with evaporation and deposit.
        
        Args:
            solutions: List of solutions from current iteration
            fitnesses: Corresponding fitness values
        """
        # Evaporation
        self.pheromone = (1 - self.evaporation_rate) * self.pheromone
        
        # Find best solution for elitist deposit
        best_idx = np.argmin(fitnesses)
        best_solution = solutions[best_idx]
        best_fitness = fitnesses[best_idx]
        
        # Update global best
        if best_fitness < self.best_fitness:
            self.best_fitness = best_fitness
            self.best_solution = best_solution
        
        # Pheromone deposit (elitist: only best solution deposits)
        deposit_amount = 1.0 / (best_fitness + 1e-10)  # Avoid division by zero
        
        for route in best_solution.routes:
            for i in range(len(route.nodes) - 1):
                from_node = route.nodes[i]
                to_node = route.nodes[i + 1]
                self.pheromone[from_node, to_node] += deposit_amount
                self.pheromone[to_node, from_node] += deposit_amount  # Symmetric
        
        # Ensure pheromone doesn't collapse
        min_pheromone = 0.01
        max_pheromone = 10.0
        self.pheromone = np.clip(self.pheromone, min_pheromone, max_pheromone)
    
    def optimize(self) -> Dict:
        """
        Run ACO optimization.
        
        Returns:
            Dictionary containing optimization results
        """
        start_time = time.time()
        
        # Main optimization loop
        stagnant = 0
        
        for iteration in range(self.max_iterations):
            # Construct solutions for all ants
            solutions = []
            fitnesses = []
            
            for _ in range(self.num_ants):
                permutation, solution = self.construct_solution()
                fitness = self.evaluate_solution(solution)
                
                solutions.append(solution)
                fitnesses.append(fitness)
            
            # Update pheromone
            self.update_pheromone(solutions, fitnesses)
            
            # Record history
            self.best_fitness_history.append(self.best_fitness)
            self.mean_fitness_history.append(np.mean(fitnesses))
            
            # Check for improvement
            if iteration > 0 and self.best_fitness_history[-1] < self.best_fitness_history[-2]:
                stagnant = 0
            else:
                stagnant += 1
            
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
        final_result = evaluate_solution(self.best_solution, self.instance)
        
        return {
            'algorithm': 'ACO',
            'best_fitness': self.best_fitness,
            'best_solution': self.best_solution,
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


def run_aco(
    instance: VRPInstance,
    num_ants: int = 30,
    max_iterations: int = 200,
    alpha: float = 1.0,
    beta: float = 2.0,
    evaporation_rate: float = 0.2,
    q0: float = 0.9,
    early_stop: int = 20,
    seed: int = 42
) -> Dict:
    """
    Convenience function to run ACO.
    
    Args:
        instance: VRP problem instance
        num_ants: Number of ants
        max_iterations: Maximum iterations
        alpha: Pheromone importance weight
        beta: Heuristic importance weight
        evaporation_rate: Pheromone evaporation rate
        q0: Exploitation vs exploration threshold
        early_stop: Early stopping threshold
        seed: Random seed
    
    Returns:
        Optimization results dictionary
    """
    aco = AntColonyOptimization(
        instance=instance,
        num_ants=num_ants,
        max_iterations=max_iterations,
        alpha=alpha,
        beta=beta,
        evaporation_rate=evaporation_rate,
        q0=q0,
        early_stop=early_stop,
        seed=seed
    )
    return aco.optimize()