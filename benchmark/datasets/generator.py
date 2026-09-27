"""
Toy dataset generator for VRP benchmarking.

Creates reproducible synthetic VRP instances with various sizes and traffic scenarios.
"""

import numpy as np
import json
from pathlib import Path
from typing import List, Tuple

from ..core.problem import VRPInstance, create_vrp_from_coordinates


def generate_toy_dataset(
    num_customers: int,
    num_vehicles: int,
    vehicle_capacity: float,
    area_size: float = 100.0,
    seed: int = 42
) -> VRPInstance:
    """
    Generate a toy VRP dataset.
    
    Args:
        num_customers: Number of customers
        num_vehicles: Number of vehicles
        vehicle_capacity: Capacity per vehicle
        area_size: Size of the area for coordinate generation
        seed: Random seed for reproducibility
    
    Returns:
        VRPInstance: Generated VRP instance
    """
    np.random.seed(seed)
    
    # Generate depot at center
    depot_coords = (area_size / 2, area_size / 2)
    
    # Generate customer coordinates randomly
    customer_coords = []
    for _ in range(num_customers):
        x = np.random.uniform(0, area_size)
        y = np.random.uniform(0, area_size)
        customer_coords.append((x, y))
    
    # Generate customer demands (random but realistic)
    # Ensure total demand is feasible
    total_capacity = num_vehicles * vehicle_capacity
    max_total_demand = total_capacity * 0.8  # Use 80% of capacity
    
    # Generate random demands
    raw_demands = np.random.uniform(1, 10, num_customers)
    
    # Scale demands to fit capacity
    scale_factor = max_total_demand / np.sum(raw_demands)
    demands = (raw_demands * scale_factor).tolist()
    
    # Round to reasonable values
    demands = [round(d, 1) for d in demands]
    
    # Create VRP instance
    instance = create_vrp_from_coordinates(
        depot_coords=depot_coords,
        customer_coords=customer_coords,
        demands=demands,
        num_vehicles=num_vehicles,
        vehicle_capacity=vehicle_capacity,
        congestion_scenario="NORMAL",
        seed=seed
    )
    
    instance.name = f"toy_{num_customers}"
    
    return instance


def generate_traffic_variant(
    base_instance: VRPInstance,
    scenario: str
) -> VRPInstance:
    """
    Generate a traffic variant of an existing VRP instance.
    
    Args:
        base_instance: Base VRP instance
        scenario: Traffic scenario (NORMAL, RUSH_HOUR, ACCIDENT)
    
    Returns:
        VRPInstance: Instance with modified traffic conditions
    """
    # Re-create instance with different traffic scenario
    depot_coords = (base_instance.depot.x, base_instance.depot.y)
    customer_coords = [(c.x, c.y) for c in base_instance.customers]
    demands = [c.demand for c in base_instance.customers]
    
    variant = create_vrp_from_coordinates(
        depot_coords=depot_coords,
        customer_coords=customer_coords,
        demands=demands,
        num_vehicles=base_instance.num_vehicles,
        vehicle_capacity=base_instance.vehicles[0].capacity,
        congestion_scenario=scenario,
        seed=base_instance.seed
    )
    
    variant.name = f"{base_instance.name}_{scenario.lower()}"
    
    return variant


def generate_all_toy_datasets(
    output_dir: str = "benchmark/datasets",
    scenarios: List[str] = ["NORMAL", "RUSH_HOUR", "ACCIDENT"]
):
    """
    Generate all toy datasets and save to files.
    
    Args:
        output_dir: Directory to save datasets
        scenarios: Traffic scenarios to generate
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Dataset configurations
    configs = [
        (10, 2, 15),   # toy_10: 10 customers, 2 vehicles, capacity 15
        (20, 5, 30),   # toy_20: 20 customers, 5 vehicles, capacity 30
        (30, 8, 40),   # toy_30: 30 customers, 8 vehicles, capacity 40
        (50, 10, 50),  # toy_50: 50 customers, 10 vehicles, capacity 50
    ]
    
    base_seed = 42
    
    for num_customers, num_vehicles, capacity in configs:
        print(f"Generating toy_{num_customers}...")
        
        # Generate base NORMAL scenario
        base_instance = generate_toy_dataset(
            num_customers=num_customers,
            num_vehicles=num_vehicles,
            vehicle_capacity=capacity,
            seed=base_seed
        )
        
        # Save NORMAL scenario
        base_file = output_path / f"toy_{num_customers}.json"
        base_instance.save(str(base_file))
        
        # Generate and save traffic variants
        for scenario in scenarios[1:]:  # Skip NORMAL (already saved)
            variant = generate_traffic_variant(base_instance, scenario)
            variant_file = output_path / f"toy_{num_customers}_{scenario.lower()}.json"
            variant.save(str(variant_file))
        
        print(f"  Saved toy_{num_customers} and variants")
    
    print(f"\nAll datasets saved to {output_dir}")


def load_dataset(filepath: str) -> VRPInstance:
    """
    Load a VRP dataset from file.
    
    Args:
        filepath: Path to dataset file
    
    Returns:
        VRPInstance: Loaded VRP instance
    """
    return VRPInstance.load(filepath)


if __name__ == "__main__":
    # Generate all toy datasets
    generate_all_toy_datasets()
    
    # Example: Load and inspect a dataset
    print("\nExample: Loading toy_20 dataset...")
    toy_20 = load_dataset("benchmark/datasets/toy_20.json")
    print(f"Loaded: {toy_20.name}")
    print(f"Customers: {toy_20.num_customers}")
    print(f"Vehicles: {toy_20.num_vehicles}")
    print(f"Total demand: {sum(c.demand for c in toy_20.customers):.1f}")
    print(f"Total capacity: {sum(v.capacity for v in toy_20.vehicles):.1f}")