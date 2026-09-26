"""
Main benchmark runner for comparing QPSO, PSO, GA, and ACO.

Runs statistical benchmarks with multiple runs and generates results.
"""

import numpy as np
import pandas as pd
import json
import time
from pathlib import Path
from typing import Dict, List, Any
import csv

from ..core.problem import VRPInstance
from ..algorithms.qpso import run_qpso
from ..algorithms.pso import run_pso
from ..algorithms.genetic_algorithm import run_ga
from ..algorithms.ant_colony import run_aco


class BenchmarkRunner:
    """
    Main benchmark runner for VRP algorithm comparison.
    
    Ensures fair comparison by:
    - Using identical problem instances
    - Using same random seed schedule
    - Equal computational budgets
    - Consistent evaluation procedures
    """
    
    def __init__(
        self,
        instance: VRPInstance,
        num_runs: int = 30,
        seed_start: int = 42,
        equalize_evaluations: bool = True
    ):
        """
        Initialize benchmark runner.
        
        Args:
            instance: VRP problem instance
            num_runs: Number of statistical runs per algorithm
            seed_start: Starting seed for reproducibility
            equalize_evaluations: Whether to equalize function evaluations
        """
        self.instance = instance
        self.num_runs = num_runs
        self.seed_start = seed_start
        self.equalize_evaluations = equalize_evaluations
        
        # Results storage
        self.results = []
        
        # Algorithm configurations (with equalized evaluations)
        self.qpso_config = {
            'swarm_size': 25,
            'max_iterations': 200,
            'beta_max': 1.0,
            'beta_min': 0.5,
            'early_stop': 20
        }
        
        self.pso_config = {
            'swarm_size': 25,
            'max_iterations': 200,
            'w': 0.7,
            'c1': 1.5,
            'c2': 1.5,
            'early_stop': 20
        }
        
        self.ga_config = {
            'population_size': 50,
            'max_iterations': 100,  # Reduced to equalize evaluations (50*100 = 5000)
            'tournament_size': 3,
            'mutation_rate': 0.1,
            'crossover_rate': 0.8,
            'elitism_count': 2,
            'early_stop': 20
        }
        
        self.aco_config = {
            'num_ants': 30,
            'max_iterations': 167,  # Adjusted to equalize evaluations (30*167 ≈ 5000)
            'alpha': 1.0,
            'beta': 2.0,
            'evaporation_rate': 0.2,
            'q0': 0.9,
            'early_stop': 20
        }
        
        if not self.equalize_evaluations:
            # Use standard values without equalization
            self.ga_config['max_iterations'] = 200
            self.aco_config['max_iterations'] = 200
    
    def run_algorithm(
        self,
        algorithm_name: str,
        seed: int
    ) -> Dict[str, Any]:
        """
        Run a single algorithm with given seed.
        
        Args:
            algorithm_name: Algorithm identifier ('QPSO', 'PSO', 'GA', 'ACO')
            seed: Random seed
        
        Returns:
            Result dictionary
        """
        np.random.seed(seed)
        
        if algorithm_name == 'QPSO':
            result = run_qpso(self.instance, seed=seed, **self.qpso_config)
        elif algorithm_name == 'PSO':
            result = run_pso(self.instance, seed=seed, **self.pso_config)
        elif algorithm_name == 'GA':
            result = run_ga(self.instance, seed=seed, **self.ga_config)
        elif algorithm_name == 'ACO':
            result = run_aco(self.instance, seed=seed, **self.aco_config)
        else:
            raise ValueError(f"Unknown algorithm: {algorithm_name}")
        
        # Add metadata
        result['algorithm'] = algorithm_name
        result['seed'] = seed
        result['dataset'] = self.instance.name
        result['scenario'] = self.instance.scenario
        
        return result
    
    def run_benchmark(self) -> List[Dict[str, Any]]:
        """
        Run complete benchmark for all algorithms.
        
        Returns:
            List of all results
        """
        algorithms = ['QPSO', 'PSO', 'GA', 'ACO']
        seeds = list(range(self.seed_start, self.seed_start + self.num_runs))
        
        print(f"Running benchmark on {self.instance.name} ({self.instance.scenario})")
        print(f"Algorithms: {algorithms}")
        print(f"Runs per algorithm: {self.num_runs}")
        print(f"Seeds: {seeds[0]} to {seeds[-1]}")
        print("-" * 60)
        
        for algorithm in algorithms:
            print(f"\nRunning {algorithm}...")
            algorithm_results = []
            
            for seed in seeds:
                result = self.run_algorithm(algorithm, seed)
                algorithm_results.append(result)
                self.results.append(result)
                
                print(f"  Seed {seed}: fitness={result['best_fitness']:.4f}, "
                      f"time={result['runtime']:.2f}s, evals={result['function_evaluations']}")
        
        print("\nBenchmark complete!")
        return self.results
    
    def save_results(self, output_dir: str = "benchmark/results"):
        """
        Save benchmark results to CSV and JSON.
        
        Args:
            output_dir: Directory to save results
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save CSV
        csv_file = output_path / f"{self.instance.name}_{self.instance.scenario.lower()}_results.csv"
        self._save_csv(csv_file)
        
        # Save JSON
        json_file = output_path / f"{self.instance.name}_{self.instance.scenario.lower()}_results.json"
        self._save_json(json_file)
        
        print(f"\nResults saved to:")
        print(f"  CSV: {csv_file}")
        print(f"  JSON: {json_file}")
    
    def _save_csv(self, filepath: Path):
        """Save results to CSV file."""
        fieldnames = [
            'algorithm', 'dataset', 'scenario', 'seed',
            'best_fitness', 'runtime', 'function_evaluations',
            'final_distance', 'final_travel_time', 'final_congestion',
            'final_emissions', 'feasible', 'constraint_penalty',
            'convergence_iteration'
        ]
        
        with open(filepath, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for result in self.results:
                row = {
                    'algorithm': result['algorithm'],
                    'dataset': result['dataset'],
                    'scenario': result['scenario'],
                    'seed': result['seed'],
                    'best_fitness': result['best_fitness'],
                    'runtime': result['runtime'],
                    'function_evaluations': result['function_evaluations'],
                    'final_distance': result['final_distance'],
                    'final_travel_time': result['final_travel_time'],
                    'final_congestion': result['final_congestion'],
                    'final_emissions': result['final_emissions'],
                    'feasible': result['feasible'],
                    'constraint_penalty': result['constraint_penalty'],
                    'convergence_iteration': result['convergence_iteration']
                }
                writer.writerow(row)
    
    def _save_json(self, filepath: Path):
        """Save results to JSON file."""
        # Prepare data for JSON serialization
        json_results = []
        
        for result in self.results:
            json_result = {
                'algorithm': result['algorithm'],
                'dataset': result['dataset'],
                'scenario': result['scenario'],
                'seed': result['seed'],
                'best_fitness': result['best_fitness'],
                'runtime': result['runtime'],
                'function_evaluations': result['function_evaluations'],
                'final_distance': result['final_distance'],
                'final_travel_time': result['final_travel_time'],
                'final_congestion': result['final_congestion'],
                'final_emissions': result['final_emissions'],
                'feasible': result['feasible'],
                'constraint_penalty': result['constraint_penalty'],
                'convergence_iteration': result['convergence_iteration'],
                'fitness_history': result['fitness_history'],
                'mean_fitness_history': result['mean_fitness_history']
            }
            json_results.append(json_result)
        
        # Add metadata
        json_data = {
            'instance': self.instance.to_dict(),
            'num_runs': self.num_runs,
            'seed_start': self.seed_start,
            'equalize_evaluations': self.equalize_evaluations,
            'algorithm_configs': {
                'QPSO': self.qpso_config,
                'PSO': self.pso_config,
                'GA': self.ga_config,
                'ACO': self.aco_config
            },
            'results': json_results
        }
        
        with open(filepath, 'w') as f:
            json.dump(json_data, f, indent=2)


def run_complete_benchmark(
    instance: VRPInstance,
    num_runs: int = 30,
    seed_start: int = 42,
    output_dir: str = "benchmark/results"
) -> List[Dict[str, Any]]:
    """
    Convenience function to run complete benchmark.
    
    Args:
        instance: VRP problem instance
        num_runs: Number of runs per algorithm
        seed_start: Starting seed
        output_dir: Directory to save results
    
    Returns:
        List of all results
    """
    runner = BenchmarkRunner(
        instance=instance,
        num_runs=num_runs,
        seed_start=seed_start
    )
    
    results = runner.run_benchmark()
    runner.save_results(output_dir)
    
    return results