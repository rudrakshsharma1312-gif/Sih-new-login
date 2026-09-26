"""
Additional comparison visualizations for benchmark results.

Generates scenario comparisons, feasibility analysis, and route visualizations.
"""

import matplotlib.pyplot as plt
import numpy as np
import json
from pathlib import Path
from typing import Dict, List, Any


def plot_scenario_comparison(
    results_files: List[str],
    output_dir: str = "benchmark/results"
):
    """
    Compare algorithm performance across different traffic scenarios.
    
    Args:
        results_files: List of result file paths for different scenarios
        output_dir: Directory to save plots
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Load results for each scenario
    scenario_data = {}
    for file_path in results_files:
        with open(file_path, 'r') as f:
            data = json.load(f)
        scenario = data['instance']['scenario']
        scenario_data[scenario] = data['results']
    
    algorithms = ['QPSO', 'PSO', 'GA', 'ACO']
    
    # Calculate mean fitness for each algorithm in each scenario
    scenario_comparison = {}
    for algo in algorithms:
        scenario_comparison[algo] = []
        for scenario in ['NORMAL', 'RUSH_HOUR', 'ACCIDENT']:
            if scenario in scenario_data:
                scenario_results = [r for r in scenario_data[scenario] if r['algorithm'] == algo]
                mean_fitness = np.mean([r['best_fitness'] for r in scenario_results])
                scenario_comparison[algo].append(mean_fitness)
            else:
                scenario_comparison[algo].append(None)
    
    # Plot
    fig, ax = plt.subplots(figsize=(12, 6))
    
    x = np.arange(len(['NORMAL', 'RUSH_HOUR', 'ACCIDENT']))
    width = 0.2
    
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    
    for i, algo in enumerate(algorithms):
        offset = (i - 1.5) * width
        bars = ax.bar(x + offset, scenario_comparison[algo], width, label=algo, color=colors[i], alpha=0.8)
    
    ax.set_xlabel('Traffic Scenario', fontsize=12)
    ax.set_ylabel('Mean Fitness', fontsize=12)
    ax.set_title('Algorithm Performance Across Traffic Scenarios', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(['NORMAL', 'RUSH_HOUR', 'ACCIDENT'])
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    
    output_file = output_path / "scenario_comparison.png"
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved scenario comparison plot: {output_file}")


def plot_feasibility_analysis(
    results_file: str,
    output_dir: str = "benchmark/results"
):
    """
    Generate feasibility analysis plot.
    
    Args:
        results_file: Path to results JSON file
        output_dir: Directory to save plots
    """
    with open(results_file, 'r') as f:
        data = json.load(f)
    
    results = data['results']
    algorithms = ['QPSO', 'PSO', 'GA', 'ACO']
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Calculate feasibility rates
    feasibility_rates = []
    for algo in algorithms:
        algo_results = [r for r in results if r['algorithm'] == algo]
        feasible_count = sum(1 for r in algo_results if r['feasible'])
        feasibility_rate = (feasible_count / len(algo_results)) * 100
        feasibility_rates.append(feasibility_rate)
    
    # Plot
    plt.figure(figsize=(10, 6))
    
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    bars = plt.bar(algorithms, feasibility_rates, color=colors, alpha=0.8)
    
    plt.ylabel('Feasibility Rate (%)', fontsize=12)
    plt.title('Algorithm Feasibility Analysis', fontsize=14, fontweight='bold')
    plt.ylim(0, 105)
    plt.grid(True, alpha=0.3, axis='y')
    
    # Add percentage labels on bars
    for bar, rate in zip(bars, feasibility_rates):
        plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{rate:.1f}%', ha='center', va='bottom', fontsize=11)
    
    plt.tight_layout()
    
    output_file = output_path / "feasibility_analysis.png"
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved feasibility analysis plot: {output_file}")


def visualize_best_routes(
    results_file: str,
    instance_file: str,
    output_dir: str = "benchmark/results"
):
    """
    Visualize the best routes from each algorithm.
    
    Args:
        results_file: Path to results JSON file
        instance_file: Path to VRP instance file
        output_dir: Directory to save plots
    """
    with open(results_file, 'r') as f:
        data = json.load(f)
    
    with open(instance_file, 'r') as f:
        instance_data = json.load(f)
    
    results = data['results']
    algorithms = ['QPSO', 'PSO', 'GA', 'ACO']
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Extract node coordinates
    depot_coords = instance_data['depot']
    customers = instance_data['customers']
    
    # Plot best route for each algorithm
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    axes = axes.flatten()
    
    for idx, algo in enumerate(algorithms):
        ax = axes[idx]
        
        # Get best result for this algorithm
        algo_results = [r for r in results if r['algorithm'] == algo]
        best_result = min(algo_results, key=lambda r: r['best_fitness'])
        
        # Plot depot
        ax.scatter(depot_coords['x'], depot_coords['y'], c='red', s=200, marker='s', 
                   label='Depot', zorder=5)
        
        # Plot customers
        for cust in customers:
            ax.scatter(cust['x'], cust['y'], c='blue', s=50, alpha=0.6, zorder=3)
        
        # Plot routes (simplified - just show customer order)
        best_permutation = best_result.get('best_permutation', [])
        if best_permutation:
            # Plot route lines
            route_x = [depot_coords['x']] + [customers[c-1]['x'] for c in best_permutation] + [depot_coords['x']]
            route_y = [depot_coords['y']] + [customers[c-1]['y'] for c in best_permutation] + [depot_coords['y']]
            ax.plot(route_x, route_y, 'g-', linewidth=2, alpha=0.7, label='Route')
        
        ax.set_title(f'{algo} (Fitness: {best_result["best_fitness"]:.4f})', 
                    fontsize=12, fontweight='bold')
        ax.set_xlabel('X Coordinate', fontsize=10)
        ax.set_ylabel('Y Coordinate', fontsize=10)
        ax.legend(fontsize=9)
        ax.grid(True, alpha=0.3)
    
    plt.suptitle('Best Routes Visualization', fontsize=14, fontweight='bold')
    plt.tight_layout()
    
    output_file = output_path / "best_routes_visualization.png"
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved routes visualization: {output_file}")