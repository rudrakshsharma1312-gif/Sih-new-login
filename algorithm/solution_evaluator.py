from .evaluator import evaluate_route


def evaluate_solution(routes, G, depot):
    """
    Evaluate a complete multi-vehicle solution.

    routes:
        List of routes, one route per vehicle.

    Returns:
        Total distance
        Total travel time
        Total congestion
        Total emissions
    """

    total_distance = 0.0
    total_travel_time = 0.0
    total_congestion = 0.0
    total_emissions = 0.0

    vehicle_results = []

    for vehicle_id, route in enumerate(routes, start=1):

        result = evaluate_route(
            route,
            G,
            depot
        )

        vehicle_results.append({
            "vehicle": vehicle_id,
            "distance": result["distance"],
            "travel_time": result["travel_time"],
            "congestion": result["congestion"],
            "emissions": result["emissions"]
        })

        total_distance += result["distance"]
        total_travel_time += result["travel_time"]
        total_congestion += result["congestion"]
        total_emissions += result["emissions"]

    return {
        "distance": total_distance,
        "travel_time": total_travel_time,
        "congestion": total_congestion,
        "emissions": total_emissions,
        "vehicle_results": vehicle_results
    }