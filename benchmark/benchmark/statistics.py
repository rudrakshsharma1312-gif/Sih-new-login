"""
Statistical analysis module for benchmark results.

Calculates performance metrics, statistical comparisons, and generates summary tables.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any
from pathlib import Path


class BenchmarkStatistics:
    """
    Statistical analysis of benchmark results.
    """
    
    def __init__(self, results: List[Dict[str, Any]]):
        """
        Initialize with benchmark results.
        
        Args:
            results: List of result dictionaries from benchmark runner
        """
        self.results = results
        self.df = pd.DataFrame(results)
    
    def calculate_summary_statistics(self) -> pd.DataFrame:
        """
        Calculate summary statistics for each algorithm.
        
        Returns:
            DataFrame with summary statistics
        """
        algorithms = self.df['algorithm'].unique()
        
        summary_data = []
        
        for algo in algorithms:
            algo_df = self.df[self.df['algorithm'] == algo]
            
            stats = {
                'algorithm': algo,
                'mean_fitness': algo_df['best_fitness'].mean(),
                'std_fitness': algo_df['best_fitness'].std(),
                'best_fitness': algo_df['best_fitness'].min(),
                'worst_fitness': algo_df['best_fitness'].max(),
                'mean_runtime': algo_df['runtime'].mean(),
                'std_runtime': algo_df['runtime'].std(),
                'mean_distance': algo_df['final_distance'].mean(),
                'mean_travel_time': algo_df['final_travel_time'].mean(),
                'mean_congestion': algo_df['final_congestion'].mean(),
                'mean_emissions': algo_df['final_emissions'].mean(),
                'feasibility_rate': (algo_df['feasible'].sum() / len(algo_df)) * 100,
                'mean_convergence': algo_df['convergence_iteration'].mean(),
                'mean_evaluations': algo_df['function_evaluations'].mean()
            }
            
            summary_data.append(stats)
        
        return pd.DataFrame(summary_data)
    
    def calculate_convergence_metrics(self) -> Dict[str, Dict[str, float]]:
        """
        Calculate convergence metrics for each algorithm.
        
        Returns:
            Dictionary mapping algorithm names to convergence metrics
        """
        algorithms = self.df['algorithm'].unique()
        convergence_metrics = {}
        
        for algo in algorithms:
            algo_df = self.df[self.df['algorithm'] == algo]
            
            # Get best fitness from all runs
            best_fitness = algo_df['best_fitness'].min()
            
            # Calculate iteration to reach 1% and 5% of best
            convergence_data = []
            
            for _, row in algo_df.iterrows():
                fitness_history = row['fitness_history']
                target_1_percent = best_fitness * 1.01
                target_5_percent = best_fitness * 1.05
                
                iter_1_percent = None
                iter_5_percent = None
                
                for i, fitness in enumerate(fitness_history):
                    if iter_1_percent is None and fitness <= target_1_percent:
                        iter_1_percent = i
                    if iter_5_percent is None and fitness <= target_5_percent:
                        iter_5_percent = i
                
                convergence_data.append({
                    'iter_1_percent': iter_1_percent,
                    'iter_5_percent': iter_5_percent
                })
            
            convergence_df = pd.DataFrame(convergence_data)
            
            convergence_metrics[algo] = {
                'mean_iter_1_percent': convergence_df['iter_1_percent'].mean(),
                'mean_iter_5_percent': convergence_df['iter_5_percent'].mean(),
                'best_fitness': best_fitness
            }
        
        return convergence_metrics
    
    def calculate_rankings(self) -> pd.DataFrame:
        """
        Calculate algorithm rankings based on different metrics.
        
        Returns:
            DataFrame with rankings
        """
        summary = self.calculate_summary_statistics()
        
        rankings = summary[['algorithm']].copy()
        
        # Rank by fitness (lower is better)
        rankings['fitness_rank'] = summary['mean_fitness'].rank(method='min')
        
        # Rank by runtime (lower is better)
        rankings['runtime_rank'] = summary['mean_runtime'].rank(method='min')
        
        # Rank by feasibility (higher is better)
        rankings['feasibility_rank'] = summary['feasibility_rate'].rank(method='min', ascending=False)
        
        # Calculate average rank
        rankings['avg_rank'] = rankings[['fitness_rank', 'runtime_rank', 'feasibility_rank']].mean(axis=1)
        
        return rankings
    
    def perform_statistical_tests(self) -> Dict[str, Any]:
        """
        Perform statistical tests between algorithms.
        
        Returns:
            Dictionary with test results
        """
        algorithms = self.df['algorithm'].unique()
        test_results = {}
        
        # Pairwise t-tests for fitness
        for i, algo1 in enumerate(algorithms):
            for algo2 in algorithms[i+1:]:
                fitness1 = self.df[self.df['algorithm'] == algo1]['best_fitness'].values
                fitness2 = self.df[self.df['algorithm'] == algo2]['best_fitness'].values
                
                # Perform t-test
                from scipy import stats
                t_stat, p_value = stats.ttest_ind(fitness1, fitness2)
                
                test_results[f"{algo1}_vs_{algo2}"] = {
                    't_statistic': t_stat,
                    'p_value': p_value,
                    'significant': p_value < 0.05
                }
        
        return test_results
    
    def generate_summary_table(self) -> str:
        """
        Generate formatted summary table.
        
        Returns:
            Formatted string with summary table
        """
        summary = self.calculate_summary_statistics()
        
        # Format table
        table = "ALGORITHM COMPARISON SUMMARY\n"
        table += "=" * 100 + "\n\n"
        
        for _, row in summary.iterrows():
            table += f"{row['algorithm']:8} | "
            table += f"Fitness: {row['mean_fitness']:8.4f} ± {row['std_fitness']:6.4f} | "
            table += f"Runtime: {row['mean_runtime']:6.2f} ± {row['std_runtime']:5.2f}s | "
            table += f"Feasible: {row['feasibility_rate']:5.1f}%\n"
        
        table += "\n" + "=" * 100 + "\n"
        
        return table


def analyze_results(results_file: str) -> BenchmarkStatistics:
    """
    Load and analyze benchmark results.
    
    Args:
        results_file: Path to results JSON file
    
    Returns:
        BenchmarkStatistics object
    """
    import json
    
    with open(results_file, 'r') as f:
        data = json.load(f)
    
    results = data['results']
    return BenchmarkStatistics(results)