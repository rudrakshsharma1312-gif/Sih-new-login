"""
Convergence visualization for benchmark results.

Generates convergence plots comparing algorithm performance over iterations.
"""

import matplotlib.pyplot as plt
import numpy as np
import json
from pathlib import Path
from typing import Dict, List, Any


def plot_convergence_curves(
    results_file: str,
    output_dir: str = "benchmark/results"
):
    """
    Generate convergence plot comparing all algorithms.
    
    Args:
        results_file: Path to results JSON file
        output_dir: Directory to save plots
    """
    with open(results_file, 'r') as f:
        data = json.load(f)
    
    results = data['results']
    algorithms = ['QPSO', 'PSO', 'GA', 'ACO']
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Extract convergence data for each algorithm
    convergence_data = {}
    for algo in algorithms:
        algo_results = [r for r in results if r['algorithm'] == algo]
        
        # Collect all fitness histories
        all_histories = [r['fitness_history'] for r in algo_results]
        
        # Pad histories to same length
        max_len = max(len(h) for h in all_histories)
        padded_histories = []
        for h in all_histories:
            padded = h + [h[-1]] * (max_len - len(h))
            padded_histories.append(padded)
        
        convergence_data[algo] = {
            'mean': np.mean(padded_histories, axis=0),
            'std': np.std(padded_histories, axis=0),
            'best': np.min(padded_histories, axis=0)
        }
    
    # Plot 1: Convergence curves (mean ± std)
    plt.figure(figsize=(12, 6))
    
    colors = {
        'QPSO': '#FF6B6B',
        'PSO': '#4ECDC4',
        'GA': '#45B7D1',
        'ACO': '#96CEB4'
    }
    
    for algo in algorithms:
        mean = convergence_data[algo]['mean']
        std = convergence_data[algo]['std']
        iterations = range(len(mean))
        
        plt.plot(iterations, mean, label=algo, color=colors[algo], linewidth=2)
        plt.fill_between(iterations, mean - std, mean + std, alpha=0.2, color=colors[algo])
    
    plt.xlabel('Iteration', fontsize=12)
    plt.ylabel('Fitness', fontsize=12)
    plt.title('Algorithm Convergence Comparison (Mean ± Std)', fontsize=14)
    plt.legend(fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    output_file = output_path / "convergence_comparison.png"
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved convergence plot: {output_file}")
    
    # Plot 2: Best convergence curves
    plt.figure(figsize=(12, 6))
    
    for algo in algorithms:
        best = convergence_data[algo]['best']
        iterations = range(len(best))
        
        plt.plot(iterations, best, label=f'{algo} (Best)', color=colors[algo], linewidth=2, linestyle='--')
    
    plt.xlabel('Iteration', fontsize=12)
    plt.ylabel('Fitness', fontsize=12)
    plt.title('Best Convergence Comparison', fontsize=14)
    plt.legend(fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    output_file = output_path / "best_convergence.png"
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved best convergence plot: {output_file}")


def plot_objective_comparison(
    results_file: str,
    output_dir: str = "benchmark/results"
):
    """
    Generate bar charts comparing final objective values.
    
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
    
    # Extract final objective values
    objectives = {
        'fitness': [],
        'distance': [],
        'travel_time': [],
        'congestion': [],
        'emissions': []
    }
    
    for algo in algorithms:
        algo_results = [r for r in results if r['algorithm'] == algo]
        
        objectives['fitness'].append([r['best_fitness'] for r in algo_results])
        objectives['distance'].append([r['final_distance'] for r in algo_results])
        objectives['travel_time'].append([r['final_travel_time'] for r in algo_results])
        objectives['congestion'].append([r['final_congestion'] for r in algo_results])
        objectives['emissions'].append([r['final_emissions'] for r in algo_results])
    
    # Plot each objective
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    axes = axes.flatten()
    
    objectives_list = ['fitness', 'distance', 'travel_time', 'congestion', 'emissions']
    titles = ['Fitness', 'Distance (km)', 'Travel Time (min)', 'Congestion', 'Emissions (kg)']
    
    for idx, (obj, title) in enumerate(zip(objectives_list, titles)):
        ax = axes[idx]
        
        data_to_plot = objectives[obj]
        
        bp = ax.boxplot(data_to_plot, labels=algorithms, patch_artist=True)
        
        # Color the boxes
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
        for patch, color in zip(bp['boxes'], colors):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)
        
        ax.set_title(title, fontsize=12, fontweight='bold')
        ax.grid(True, alpha=0.3, axis='y')
    
    # Remove empty subplot
    axes[5].axis('off')
    
    plt.suptitle('Final Objective Values Comparison', fontsize=14, fontweight='bold')
    plt.tight_layout()
    
    output_file = output_path / "objective_comparison.png"
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved objective comparison plot: {output_file}")


def plot_runtime_comparison(
    results_file: str,
    output_dir: str = "benchmark/results"
):
    """
    Generate runtime comparison plot.
    
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
    
    # Extract runtime data
    runtime_data = []
    for algo in algorithms:
        algo_results = [r for r in results if r['algorithm'] == algo]
        runtimes = [r['runtime'] for r in algo_results]
        runtime_data.append(runtimes)
    
    # Plot
    plt.figure(figsize=(10, 6))
    
    bp = plt.boxplot(runtime_data, labels=algorithms, patch_artist=True)
    
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    for patch, color in zip(bp['boxes'], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
    
    plt.ylabel('Runtime (seconds)', fontsize=12)
    plt.title('Algorithm Runtime Comparison', fontsize=14, fontweight='bold')
    plt.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    
    output_file = output_path / "runtime_comparison.png"
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved runtime comparison plot: {output_file}")