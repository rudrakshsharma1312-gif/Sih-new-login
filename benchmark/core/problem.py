"""
Core problem definition for Capacitated Multi-Vehicle VRP.

Defines the VRP problem instance with depot, customers, vehicles,
graph structure, and constraints.
"""

from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional
import numpy as np
import json


@dataclass
class Customer:
    """Represents a customer in the VRP."""
    id: int
    x: float
    y: float
    demand: float
    
    def __repr__(self):
        return f"Customer({self.id}, demand={self.demand})"


@dataclass
class Vehicle:
    """Represents a vehicle in the VRP."""
    id: int
    capacity: float
    
    def __repr__(self):
        return f"Vehicle({self.id}, capacity={self.capacity})"


@dataclass
class Edge:
    """Represents an edge in the transportation graph."""
    from_node: int
    to_node: int
    distance: float
    travel_time: float
    congestion_factor: float = 1.0
    
    def __repr__(self):
        return f"Edge({self.from_node}->{self.to_node}, dist={self.distance:.2f})"


@dataclass
class VRPInstance:
    """
    Complete VRP problem instance.
    
    This class fully defines a VRP instance including:
    - Depot location
    - Customer locations and demands
    - Vehicle fleet and capacities
    - Road network with distances, travel times, and congestion
    - Problem constraints
    """
    depot: Customer
    customers: List[Customer]
    vehicles: List[Vehicle]
    distance_matrix: np.ndarray
    travel_time_matrix: np.ndarray
    congestion_matrix: np.ndarray
    vehicle_weight_factor: float = 1.0
    emissions_per_km: float = 0.19  # kg CO2 per km
    
    # Fitness weights (PRD defaults)
    alpha: float = 0.4  # travel time weight
    beta: float = 0.3   # distance weight
    gamma: float = 0.2  # congestion weight
    delta: float = 0.1  # emissions weight
    
    # Constraint penalty multiplier
    constraint_penalty: float = 1000.0
    
    # Metadata
    name: str = "unknown"
    scenario: str = "NORMAL"
    seed: int = 42
    
    def __post_init__(self):
        """Validate the VRP instance after initialization."""
        self._validate_instance()
    
    def _validate_instance(self):
        """Validate that the VRP instance is well-formed."""
        n_customers = len(self.customers)
        n_vehicles = len(self.vehicles)
        
        # Check matrix dimensions
        total_nodes = n_customers + 1  # +1 for depot (index 0)
        assert self.distance_matrix.shape == (total_nodes, total_nodes), \
            f"Distance matrix shape {self.distance_matrix.shape} doesn't match {total_nodes} nodes"
        assert self.travel_time_matrix.shape == (total_nodes, total_nodes), \
            f"Travel time matrix shape {self.travel_time_matrix.shape} doesn't match {total_nodes} nodes"
        assert self.congestion_matrix.shape == (total_nodes, total_nodes), \
            f"Congestion matrix shape {self.congestion_matrix.shape} doesn't match {total_nodes} nodes"
        
        # Check positive values
        assert all(c.demand > 0 for c in self.customers), "All customer demands must be positive"
        assert all(v.capacity > 0 for v in self.vehicles), "All vehicle capacities must be positive"
        
        # Check feasibility
        total_demand = sum(c.demand for c in self.customers)
        total_capacity = sum(v.capacity for v in self.vehicles)
        assert total_demand <= total_capacity, \
            f"Total demand {total_demand} exceeds total capacity {total_capacity}"
        
        # Check diagonal of matrices (should be 0)
        assert np.allclose(np.diag(self.distance_matrix), 0), "Distance matrix diagonal should be 0"
        assert np.allclose(np.diag(self.travel_time_matrix), 0), "Travel time matrix diagonal should be 0"
    
    @property
    def num_customers(self) -> int:
        """Number of customers."""
        return len(self.customers)
    
    @property
    def num_vehicles(self) -> int:
        """Number of vehicles."""
        return len(self.vehicles)
    
    @property
    def total_nodes(self) -> int:
        """Total number of nodes (depot + customers)."""
        return self.num_customers + 1
    
    def get_customer_demand(self, customer_id: int) -> float:
        """Get demand for a customer by ID."""
        for customer in self.customers:
            if customer.id == customer_id:
                return customer.demand
        raise ValueError(f"Customer {customer_id} not found")
    
    def get_vehicle_capacity(self, vehicle_id: int) -> float:
        """Get capacity for a vehicle by ID."""
        for vehicle in self.vehicles:
            if vehicle.id == vehicle_id:
                return vehicle.capacity
        raise ValueError(f"Vehicle {vehicle_id} not found")
    
    def get_distance(self, from_node: int, to_node: int) -> float:
        """Get distance between two nodes."""
        return self.distance_matrix[from_node, to_node]
    
    def get_travel_time(self, from_node: int, to_node: int) -> float:
        """Get travel time between two nodes."""
        return self.travel_time_matrix[from_node, to_node]
    
    def get_congestion(self, from_node: int, to_node: int) -> float:
        """Get congestion factor between two nodes."""
        return self.congestion_matrix[from_node, to_node]
    
    def to_dict(self) -> Dict:
        """Convert VRP instance to dictionary for serialization."""
        return {
            'name': self.name,
            'scenario': self.scenario,
            'seed': self.seed,
            'depot': {
                'id': self.depot.id,
                'x': self.depot.x,
                'y': self.depot.y,
                'demand': self.depot.demand
            },
            'customers': [
                {'id': c.id, 'x': c.x, 'y': c.y, 'demand': c.demand}
                for c in self.customers
            ],
            'vehicles': [
                {'id': v.id, 'capacity': v.capacity}
                for v in self.vehicles
            ],
            'distance_matrix': self.distance_matrix.tolist(),
            'travel_time_matrix': self.travel_time_matrix.tolist(),
            'congestion_matrix': self.congestion_matrix.tolist(),
            'vehicle_weight_factor': self.vehicle_weight_factor,
            'emissions_per_km': self.emissions_per_km,
            'alpha': self.alpha,
            'beta': self.beta,
            'gamma': self.gamma,
            'delta': self.delta,
            'constraint_penalty': self.constraint_penalty
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'VRPInstance':
        """Create VRP instance from dictionary."""
        depot_data = data['depot']
        depot = Customer(id=depot_data['id'], x=depot_data['x'], 
                        y=depot_data['y'], demand=depot_data['demand'])
        
        customers = [
            Customer(id=c['id'], x=c['x'], y=c['y'], demand=c['demand'])
            for c in data['customers']
        ]
        
        vehicles = [
            Vehicle(id=v['id'], capacity=v['capacity'])
            for v in data['vehicles']
        ]
        
        return cls(
            depot=depot,
            customers=customers,
            vehicles=vehicles,
            distance_matrix=np.array(data['distance_matrix']),
            travel_time_matrix=np.array(data['travel_time_matrix']),
            congestion_matrix=np.array(data['congestion_matrix']),
            vehicle_weight_factor=data.get('vehicle_weight_factor', 1.0),
            emissions_per_km=data.get('emissions_per_km', 0.19),
            alpha=data.get('alpha', 0.4),
            beta=data.get('beta', 0.3),
            gamma=data.get('gamma', 0.2),
            delta=data.get('delta', 0.1),
            constraint_penalty=data.get('constraint_penalty', 1000.0),
            name=data.get('name', 'unknown'),
            scenario=data.get('scenario', 'NORMAL'),
            seed=data.get('seed', 42)
        )
    
    def save(self, filepath: str):
        """Save VRP instance to JSON file."""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load(cls, filepath: str) -> 'VRPInstance':
        """Load VRP instance from JSON file."""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)


def create_vrp_from_coordinates(
    depot_coords: Tuple[float, float],
    customer_coords: List[Tuple[float, float]],
    demands: List[float],
    num_vehicles: int,
    vehicle_capacity: float,
    congestion_scenario: str = "NORMAL",
    seed: int = 42
) -> VRPInstance:
    """
    Create a VRP instance from coordinates and demands.
    
    Args:
        depot_coords: (x, y) coordinates of depot
        customer_coords: List of (x, y) coordinates for customers
        demands: List of customer demands
        num_vehicles: Number of vehicles
        vehicle_capacity: Capacity per vehicle
        congestion_scenario: Traffic scenario (NORMAL, RUSH_HOUR, ACCIDENT)
        seed: Random seed for reproducibility
    
    Returns:
        VRPInstance: Complete VRP problem instance
    """
    np.random.seed(seed)
    
    # Create depot (index 0)
    depot = Customer(id=0, x=depot_coords[0], y=depot_coords[1], demand=0)
    
    # Create customers (indices 1 to n)
    customers = [
        Customer(id=i+1, x=coords[0], y=coords[1], demand=demands[i])
        for i, coords in enumerate(customer_coords)
    ]
    
    # Create vehicles
    vehicles = [Vehicle(id=i, capacity=vehicle_capacity) for i in range(num_vehicles)]
    
    # Calculate distance matrix (Euclidean)
    all_coords = [depot_coords] + customer_coords
    n = len(all_coords)
    distance_matrix = np.zeros((n, n))
    
    for i in range(n):
        for j in range(n):
            if i != j:
                dx = all_coords[i][0] - all_coords[j][0]
                dy = all_coords[i][1] - all_coords[j][1]
                distance_matrix[i, j] = np.sqrt(dx**2 + dy**2)
    
    # Calculate travel time matrix (base: distance / average speed)
    avg_speed = 30.0  # km/h
    travel_time_matrix = distance_matrix / avg_speed * 60  # convert to minutes
    
    # Create congestion matrix based on scenario
    congestion_matrix = np.ones((n, n))
    
    if congestion_scenario == "RUSH_HOUR":
        # Higher congestion on all edges
        congestion_matrix = 1.0 + np.random.uniform(0.5, 1.5, (n, n))
        np.fill_diagonal(congestion_matrix, 1.0)
    
    elif congestion_scenario == "ACCIDENT":
        # Normal congestion with specific accident corridors
        congestion_matrix = 1.0 + np.random.uniform(0.0, 0.5, (n, n))
        np.fill_diagonal(congestion_matrix, 1.0)
        
        # Create accident on random edges (20% of edges)
        num_accident_edges = int(0.2 * n * (n - 1))
        accident_edges = np.random.choice(n * (n - 1), num_accident_edges, replace=False)
        
        for edge_idx in accident_edges:
            i = edge_idx // (n - 1)
            j = edge_idx % (n - 1)
            if j >= i:
                j += 1
            congestion_matrix[i, j] *= 3.0  # 3x congestion on accident edges
            congestion_matrix[j, i] *= 3.0
    
    # Apply congestion to travel time
    travel_time_matrix = travel_time_matrix * congestion_matrix
    
    instance_name = f"toy_{len(customers)}"
    
    return VRPInstance(
        depot=depot,
        customers=customers,
        vehicles=vehicles,
        distance_matrix=distance_matrix,
        travel_time_matrix=travel_time_matrix,
        congestion_matrix=congestion_matrix,
        name=instance_name,
        scenario=congestion_scenario,
        seed=seed
    )