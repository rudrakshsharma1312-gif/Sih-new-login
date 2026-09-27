"""
Main benchmark execution script.

Runs complete benchmark with all algorithms, generates visualizations,
and produces benchmark report.
"""

import sys
import time
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.problem import VRPInstance
from benchmark.runner import run_complete_benchmark
from benchmark.statistics import BenchmarkStatistics, analyze_results
from visualization.convergence import plot_convergence_curves, plot_objective_comparison, plot_runtime_comparison
from visualization.comparison import plot_scenario_comparison, plot_feasibility_analysis, visualize_best_routes


def run_full_benchmark(
    dataset_name: str = "toy_20",
    scenario: str = "NORMAL",
    num_runs: int = 30,
    output_dir: str = "benchmark/results"
):
    """
    Run complete benchmark pipeline.
    
    Args:
        dataset_name: Name of dataset (toy_10, toy_20, toy_30, toy_50)
        scenario: Traffic scenario (NORMAL, RUSH_HOUR, ACCIDENT)
        num_runs: Number of runs per algorithm
        output_dir: Directory for results
    """
    print("=" * 80)
    print("VRP METAHEURISTIC BENCHMARK")
    print("=" * 80)
    print(f"\nDataset: {dataset_name}")
    print(f"Scenario: {scenario}")
    print(f"Runs: {num_runs}")
    print("-" * 80)
    
    # Load dataset
    dataset_file = f"benchmark/datasets/{dataset_name}_{scenario.lower()}.json"
    if not Path(dataset_file).exists():
        dataset_file = f"benchmark/datasets/{dataset_name}.json"
    
    print(f"\nLoading dataset from {dataset_file}...")
    instance = VRPInstance.load(dataset_file)
    print(f"Loaded: {instance.name} ({instance.scenario})")
    print(f"Customers: {instance.num_customers}")
    print(f"Vehicles: {instance.num_vehicles}")
    print(f"Total demand: {sum(c.demand for c in instance.customers):.1f}")
    print(f"Total capacity: {sum(v.capacity for v in instance.vehicles):.1f}")
    
    # Run benchmark
    print(f"\nRunning benchmark...")
    start_time = time.time()
    results = run_complete_benchmark(instance, num_runs=num_runs, output_dir=output_dir)
    benchmark_time = time.time() - start_time
    
    print(f"\nBenchmark completed in {benchmark_time:.2f} seconds")
    
    # Analyze results
    print(f"\nAnalyzing results...")
    results_file = f"{output_dir}/{dataset_name}_{scenario.lower()}_results.json"
    stats = analyze_results(results_file)
    
    # Print summary table
    print("\n" + stats.generate_summary_table())
    
    # Generate visualizations
    print(f"\nGenerating visualizations...")
    plot_convergence_curves(results_file, output_dir)
    plot_objective_comparison(results_file, output_dir)
    plot_runtime_comparison(results_file, output_dir)
    plot_feasibility_analysis(results_file, output_dir)
    visualize_best_routes(results_file, dataset_file, output_dir)
    
    # Generate benchmark report
    print(f"\nGenerating benchmark report...")
    generate_benchmark_report(instance, stats, results_file, output_dir, benchmark_time)
    
    print(f"\n" + "=" * 80)
    print("BENCHMARK COMPLETE")
    print("=" * 80)
    print(f"\nResults saved to: {output_dir}/")
    print(f"  - CSV results: {dataset_name}_{scenario.lower()}_results.csv")
    print(f"  - JSON results: {dataset_name}_{scenario.lower()}_results.json")
    print(f"  - Benchmark report: benchmark_report.md")
    print(f"  - Visualizations: *.png")


def generate_benchmark_report(
    instance: VRPInstance,
    stats: BenchmarkStatistics,
    results_file: str,
    output_dir: str,
    benchmark_time: float
):
    """
    Generate comprehensive benchmark report in Markdown.
    
    Args:
        instance: VRP problem instance
        stats: Benchmark statistics
        results_file: Path to results JSON file
        output_dir: Output directory
        benchmark_time: Total benchmark runtime
    """
    import json
    
    with open(results_file, 'r') as f:
        data = json.load(f)
    
    summary = stats.calculate_summary_statistics()
    convergence = stats.calculate_convergence_metrics()
    
    report = f"""# VRP Metaheuristic Benchmark Report

## Problem Definition

This benchmark compares four metaheuristic algorithms for the Capacitated Multi-Vehicle Vehicle Routing Problem (VRP):

- **Quantum Particle Swarm Optimization (QPSO)**
- **Classical Particle Swarm Optimization (PSO)**
- **Genetic Algorithm (GA)**
- **Ant Colony Optimization (ACO)**

### Problem Instance

- **Dataset**: {instance.name}
- **Scenario**: {instance.scenario}
- **Customers**: {instance.num_customers}
- **Vehicles**: {instance.num_vehicles}
- **Vehicle Capacity**: {instance.vehicles[0].capacity}
- **Total Demand**: {sum(c.demand for c in instance.customers):.1f}
- **Total Capacity**: {sum(v.capacity for v in instance.vehicles):.1f}

### Objective Function

All algorithms use the same multi-objective fitness function:

```
fitness = α * normalized_travel_time
        + β * normalized_distance
        + γ * normalized_congestion
        + δ * normalized_emissions
        + constraint_penalty
```

Where:
- α = 0.4 (travel time weight)
- β = 0.3 (distance weight)
- γ = 0.2 (congestion weight)
- δ = 0.1 (emissions weight)

## Algorithm Descriptions

### QPSO (Quantum Particle Swarm Optimization)

Uses quantum position update without velocity:
```
X_i(t+1) = p_i(t) ± β(t) * |MBEST(t) - X_i(t)| * ln(1/u)
```

**Key Features**:
- No velocity component
- MBEST (mean of personal best positions)
- β(t) decay coefficient (1.0 → 0.5)
- Quantum wave function principles

### PSO (Classical Particle Swarm Optimization)

Uses standard velocity-based update:
```
V(t+1) = w*V(t) + c1*r1*(pbest-X) + c2*r2*(gbest-X)
X(t+1) = X(t) + V(t+1)
```

**Key Features**:
- Velocity-based movement
- Inertia weight w = 0.7
- Cognitive coefficient c1 = 1.5
- Social coefficient c2 = 1.5

### GA (Genetic Algorithm)

Permutation-based genetic algorithm:
- **Selection**: Tournament selection (size 3)
- **Crossover**: Order Crossover (OX)
- **Mutation**: Swap mutation (rate 0.1)
- **Elitism**: Preserves top 2 individuals

### ACO (Ant Colony Optimization)

Pheromone-based construction:
- **Pheromone**: τ(i,j) with evaporation rate ρ = 0.2
- **Heuristic**: η(i,j) = 1/distance(i,j)
- **Transition**: P(i,j) = τ^α * η^β / Σ
- **Update**: Elitist best-so-far reinforcement

## Hyperparameters

### Computational Budget
- **QPSO**: 25 particles × 200 iterations = 5,000 evaluations
- **PSO**: 25 particles × 200 iterations = 5,000 evaluations
- **GA**: 50 population × 100 iterations = 5,000 evaluations
- **ACO**: 30 ants × 167 iterations = 5,010 evaluations

### Algorithm-Specific Parameters

**QPSO**:
- Swarm size: 25
- β_max: 1.0, β_min: 0.5
- Early stop: 20 iterations

**PSO**:
- Swarm size: 25
- w: 0.7, c1: 1.5, c2: 1.5
- Early stop: 20 iterations

**GA**:
- Population: 50
- Tournament size: 3
- Mutation rate: 0.1, Crossover rate: 0.8
- Elitism: 2 individuals
- Early stop: 20 iterations

**ACO**:
- Ants: 30
- α: 1.0, β: 2.0
- Evaporation rate: 0.2
- Early stop: 20 iterations

## Experimental Methodology

### Number of Runs
- **Runs per algorithm**: {len([r for r in data['results'] if r['algorithm'] == 'QPSO'])}
- **Random seeds**: {data['seed_start']} to {data['seed_start'] + len([r for r in data['results'] if r['algorithm'] == 'QPSO']) - 1}

### Fairness Measures
1. **Same problem instance**: All algorithms solve identical VRP instance
2. **Same fitness function**: Shared evaluation function for all algorithms
3. **Same seed schedule**: Identical random seeds for each algorithm
4. **Equal computational budget**: ~5,000 function evaluations per algorithm
5. **Same constraints**: Identical capacity and routing constraints

## Results

### Performance Summary

| Algorithm | Mean Fitness | Std Dev | Runtime (s) | Feasibility (%) |
|-----------|--------------|---------|-------------|------------------|
"""

    for _, row in summary.iterrows():
        report += f"| {row['algorithm']:8} | {row['mean_fitness']:12.4f} | {row['std_fitness']:8.4f} | {row['mean_runtime']:12.2f} | {row['feasibility_rate']:15.1f} |\n"

    report += f"""
### Best Performance

| Algorithm | Best Fitness | Worst Fitness | Mean Distance | Mean Time |
|-----------|-------------|---------------|---------------|-----------|
"""

    for _, row in summary.iterrows():
        report += f"| {row['algorithm']:8} | {row['best_fitness']:12.4f} | {row['worst_fitness']:14.4f} | {row['mean_distance']:13.2f} | {row['mean_travel_time']:10.2f} |\n"

    report += f"""
### Convergence Analysis

| Algorithm | Mean Iteration to 1% of Best | Mean Iteration to 5% of Best |
|-----------|-------------------------------|-------------------------------|
"""

    for algo, metrics in convergence.items():
        report += f"| {algo:8} | {metrics['mean_iter_1_percent']:32.1f} | {metrics['mean_iter_5_percent']:33.1f} |\n"

    report += f"""
## Detailed Metrics

### Distance Comparison
- **QPSO**: {summary[summary['algorithm'] == 'QPSO']['mean_distance'].values[0]:.2f} km
- **PSO**: {summary[summary['algorithm'] == 'PSO']['mean_distance'].values[0]:.2f} km
- **GA**: {summary[summary['algorithm'] == 'GA']['mean_distance'].values[0]:.2f} km
- **ACO**: {summary[summary['algorithm'] == 'ACO']['mean_distance'].values[0]:.2f} km

### Travel Time Comparison
- **QPSO**: {summary[summary['algorithm'] == 'QPSO']['mean_travel_time'].values[0]:.2f} min
- **PSO**: {summary[summary['algorithm'] == 'PSO']['mean_travel_time'].values[0]:.2f} min
- **GA**: {summary[summary['algorithm'] == 'GA']['mean_travel_time'].values[0]:.2f} min
- **ACO**: {summary[summary['algorithm'] == 'ACO']['mean_travel_time'].values[0]:.2f} min

### Congestion Comparison
- **QPSO**: {summary[summary['algorithm'] == 'QPSO']['mean_congestion'].values[0]:.2f}
- **PSO**: {summary[summary['algorithm'] == 'PSO']['mean_congestion'].values[0]:.2f}
- **GA**: {summary[summary['algorithm'] == 'GA']['mean_congestion'].values[0]:.2f}
- **ACO**: {summary[summary['algorithm'] == 'ACO']['mean_congestion'].values[0]:.2f}

### Emissions Comparison
- **QPSO**: {summary[summary['algorithm'] == 'QPSO']['mean_emissions'].values[0]:.2f} kg
- **PSO**: {summary[summary['algorithm'] == 'PSO']['mean_emissions'].values[0]:.2f} kg
- **GA**: {summary[summary['algorithm'] == 'GA']['mean_emissions'].values[0]:.2f} kg
- **ACO**: {summary[summary['algorithm'] == 'ACO']['mean_emissions'].values[0]:.2f} kg

## Limitations

1. **Dataset Size**: Results are for synthetic toy datasets; real-world performance may differ
2. **Algorithm Variants**: Many algorithm variants exist; these are standard implementations
3. **Local Optima**: Metaheuristics may converge to local optima; multiple runs mitigate this
4. **Simplified Constraints**: Real VRP may have additional constraints not modeled here
5. **Computation Time**: Benchmark times are for single-threaded execution

## Reproducibility Instructions

To reproduce these results:

1. Install dependencies: `pip install numpy pandas matplotlib scipy`
2. Generate datasets: `python benchmark/datasets/generator.py`
3. Run benchmark: `python benchmark/benchmark/evaluator.py`
4. Results will be saved to `benchmark/results/`

## Benchmark Execution

- **Total runtime**: {benchmark_time:.2f} seconds
- **Results location**: {output_dir}/
- **Generated files**:
  - CSV results
  - JSON results
  - Convergence plots
  - Comparison plots
  - Benchmark report (this file)

---

*Generated by VRP Metaheuristic Benchmark Framework*
*Date: {time.strftime('%Y-%m-%d %H:%M:%S')}*
"""

    # Save report
    report_file = Path(output_dir) / "benchmark_report.md"
    with open(report_file, 'w') as f:
        f.write(report)
    
    print(f"Saved benchmark report: {report_file}")


if __name__ == "__main__":
    # Run default benchmark
    run_full_benchmark(
        dataset_name="toy_20",
        scenario="NORMAL",
        num_runs=30,
        output_dir="benchmark/results"
    )