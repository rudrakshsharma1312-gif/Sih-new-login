from .decoder import decode_particle
from .solution_evaluator import evaluate_solution
from .fitness import calculate_fitness


def evaluate_particle(
    particle,
    destinations,
    n_vehicles,
    index_to_node,
    graph,
    depot_node,
    reference_bounds
):
    """
    Decode a QPSO particle, evaluate the resulting
    multi-vehicle solution, and calculate its fitness.
    """

    routes = decode_particle(
        particle,
        destinations,
        n_vehicles
    )

    routes_graph = [
        [
            str(index_to_node[str(node)])
            for node in route
        ]
        for route in routes
    ]

    solution = evaluate_solution(
        routes_graph,
        graph,
        depot_node
    )

    fitness = calculate_fitness(
        solution,
        reference_bounds
    )

    return {
        "fitness": fitness,
        "solution": solution,
        "routes": routes_graph
    }