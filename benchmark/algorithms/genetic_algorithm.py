"""
Genetic Algorithm (GA) for VRP.

Implements permutation-based GA with tournament selection, order crossover (OX),
and swap mutation.
"""

import numpy as np
from typing import Dict, List, Tuple
import time

from ..core.problem import VRPInstance
from ..core.solution import VRPSolution
from ..core.decoder import route_decoder
from ..core.repair import repair_solution
from ..core.fitness import evaluate_solution


class GeneticAlgorithm:
    """
    Genetic Algorithm for VRP.
    
    Uses permutation-based representation with:
    - Tournament selection
    - Order Crossover (OX)
    - Swap mutation
    - Elitism
    """
    
    def __init__(
        self,
        instance: VRPInstance,
        population_size: int = 50,
        max_iterations: int = 200,
        tournament_size: int = 3,
        mutation_rate: float = 0.1,
        crossover_rate: float = 0.8,
        elitism_count: int = 2,
        early_stop: int = 20,
        seed: int = 42
    ):
        """
        Initialize GA algorithm.
        
        Args:
            instance: VRP problem instance
            population_size: Number of individuals
            max_iterations: Maximum generations
            tournament_size: Tournament selection size
            mutation_rate: Probability of mutation
            crossover_rate: Probability of crossover
            elitism_count: Number of elite individuals preserved
            early_stop: Stop if no improvement for this many iterations
            seed: Random seed for reproducibility
        """
        self.instance = instance
        self.population_size = population_size
        self.max_iterations = max_iterations
        self.tournament_size = tournament_size
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elitism_count = elitism_count
        self.early_stop = early_stop
        self.seed = seed
        
        np.random.seed(seed)
        
        # Algorithm state
        self.population = None
        self.fitness = None
        self.best_individual = None
        self.best_fitness = float('inf')
        self.best_solution = None
        
        # Convergence tracking
        self.best_fitness_history = []
        self.mean_fitness_history = []
        
        # Metrics
        self.function_evaluations = 0
        self.runtime = 0.0
        self.convergence_iteration = max_iterations
    
    def initialize_population(self):
        """Initialize random permutation population."""
        n_customers = self.instance.num_customers
        
        self.population = []
        self.fitness = []
        
        for _ in range(self.population_size):
            # Random permutation
            individual = np.random.permutation(n_customers) + 1  # 1-indexed
            self.population.append(individual)
            
            # Evaluate
            fitness, solution = self._evaluate_individual(individual)
            self.fitness.append(fitness)
            
            # Track best
            if fitness < self.best_fitness:
                self.best_fitness = fitness
                self.best_individual = individual.copy()
                self.best_solution = solution
        
        self.best_fitness_history.append(self.best_fitness)
        self.mean_fitness_history.append(np.mean(self.fitness))
    
    def _evaluate_individual(self, individual: np.ndarray) -> Tuple[float, VRPSolution]:
        """
        Evaluate an individual (permutation).
        
        Args:
            individual: Customer permutation (1-indexed)
        
        Returns:
            Tuple of (fitness, solution)
        """
        self.function_evaluations += 1
        
        # Decode permutation to routes
        solution = route_decoder(individual.tolist(), self.instance, use_capacity_constraints=True)
        
        # Repair if needed
        if not solution.feasible:
            solution = repair_solution(solution, self.instance)
        
        # Evaluate fitness
        result = evaluate_solution(solution, self.instance)
        
        return result['fitness'], solution
    
    def tournament_selection(self) -> np.ndarray:
        """
        Select parent using tournament selection.
        
        Returns:
            Selected individual (permutation)
        """
        # Randomly select tournament_size individuals
        tournament_indices = np.random.choice(self.population_size, self.tournament_size, replace=False)
        tournament_fitness = [self.fitness[i] for i in tournament_indices]
        
        # Select best (lowest fitness since minimizing)
        winner_idx = tournament_indices[np.argmin(tournament_fitness)]
        
        return self.population[winner_idx].copy()
    
    def order_crossover(self, parent1: np.ndarray, parent2: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Perform Order Crossover (OX).
        
        Preserves relative order and produces valid permutations.
        
        Args:
            parent1: First parent permutation
            parent2: Second parent permutation
        
        Returns:
            Tuple of (child1, child2)
        """
        n = len(parent1)
        
        # Select random crossover points
        start, end = sorted(np.random.choice(n, 2, replace=False))
        
        # Initialize children with -1 (placeholder)
        child1 = np.full(n, -1)
        child2 = np.full(n, -1)
        
        # Copy segment from parent1 to child1 and parent2 to child2
        child1[start:end+1] = parent1[start:end+1]
        child2[start:end+1] = parent2[start:end+1]
        
        # Fill remaining positions preserving order
        def fill_child(child, parent1_segment, parent2):
            # Get remaining genes from parent2 in order
            remaining = []
            for gene in parent2:
                if gene not in parent1_segment:
                    remaining.append(gene)
            
            # Fill child positions
            idx = 0
            for i in range(n):
                if child[i] == -1:
                    child[i] = remaining[idx]
                    idx += 1
        
        fill_child(child1, parent1[start:end+1], parent2)
        fill_child(child2, parent2[start:end+1], parent1)
        
        return child1, child2
    
    def swap_mutation(self, individual: np.ndarray) -> np.ndarray:
        """
        Perform swap mutation.
        
        Randomly swap two positions in the permutation.
        
        Args:
            individual: Permutation to mutate
        
        Returns:
            Mutated permutation
        """
        mutated = individual.copy()
        
        # Select two random positions
        idx1, idx2 = np.random.choice(len(individual), 2, replace=False)
        
        # Swap
        mutated[idx1], mutated[idx2] = mutated[idx2], mutated[idx1]
        
        return mutated
    
    def evolve(self):
        """Perform one generation of evolution."""
        new_population = []
        new_fitness = []
        
        # Elitism: preserve best individuals
        elite_indices = np.argsort(self.fitness)[:self.elitism_count]
        for idx in elite_indices:
            new_population.append(self.population[idx].copy())
            new_fitness.append(self.fitness[idx])
        
        # Generate offspring
        while len(new_population) < self.population_size:
            # Selection
            parent1 = self.tournament_selection()
            parent2 = self.tournament_selection()
            
            # Crossover
            if np.random.random() < self.crossover_rate:
                child1, child2 = self.order_crossover(parent1, parent2)
            else:
                child1, child2 = parent1.copy(), parent2.copy()
            
            # Mutation
            if np.random.random() < self.mutation_rate:
                child1 = self.swap_mutation(child1)
            if np.random.random() < self.mutation_rate:
                child2 = self.swap_mutation(child2)
            
            # Add to new population
            new_population.append(child1)
            if len(new_population) < self.population_size:
                new_population.append(child2)
        
        # Evaluate new population
        self.population = new_population
        self.fitness = []
        
        for individual in self.population:
            fitness, solution = self._evaluate_individual(individual)
            self.fitness.append(fitness)
            
            # Track best
            if fitness < self.best_fitness:
                self.best_fitness = fitness
                self.best_individual = individual.copy()
                self.best_solution = solution
    
    def optimize(self) -> Dict:
        """
        Run GA optimization.
        
        Returns:
            Dictionary containing optimization results
        """
        start_time = time.time()
        
        # Initialize population
        self.initialize_population()
        
        # Main evolution loop
        stagnant = 0
        
        for iteration in range(self.max_iterations):
            # Evolve one generation
            self.evolve()
            
            # Record history
            self.best_fitness_history.append(self.best_fitness)
            self.mean_fitness_history.append(np.mean(self.fitness))
            
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
            'algorithm': 'GA',
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


def run_ga(
    instance: VRPInstance,
    population_size: int = 50,
    max_iterations: int = 200,
    tournament_size: int = 3,
    mutation_rate: float = 0.1,
    crossover_rate: float = 0.8,
    elitism_count: int = 2,
    early_stop: int = 20,
    seed: int = 42
) -> Dict:
    """
    Convenience function to run GA.
    
    Args:
        instance: VRP problem instance
        population_size: Number of individuals
        max_iterations: Maximum generations
        tournament_size: Tournament selection size
        mutation_rate: Mutation probability
        crossover_rate: Crossover probability
        elitism_count: Number of elite individuals
        early_stop: Early stopping threshold
        seed: Random seed
    
    Returns:
        Optimization results dictionary
    """
    ga = GeneticAlgorithm(
        instance=instance,
        population_size=population_size,
        max_iterations=max_iterations,
        tournament_size=tournament_size,
        mutation_rate=mutation_rate,
        crossover_rate=crossover_rate,
        elitism_count=elitism_count,
        early_stop=early_stop,
        seed=seed
    )
    return ga.optimize()