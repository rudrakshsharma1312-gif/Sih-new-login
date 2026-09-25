import numpy as np


OBJECTIVES = [
    "travel_time",
    "distance",
    "congestion",
    "emissions"
]


def normalize_solution(
    solution,
    fixed_bounds
):

    normalized = {}

    for objective in OBJECTIVES:

        value = float(
            solution[objective]
        )

        min_value = fixed_bounds[
            objective
        ]["min"]

        max_value = fixed_bounds[
            objective
        ]["max"]

        normalized_value = (
            value - min_value
        ) / (
            max_value - min_value
        )

        # Numerical protection only.
        # With conservative bounds, values should already
        # lie inside [0,1].

        normalized_value = np.clip(
            normalized_value,
            0.0,
            1.0
        )

        normalized[objective] = (
            normalized_value
        )

    return normalized

def calculate_fitness(
    solution,
    fixed_bounds
):

    normalized = normalize_solution(
        solution,
        fixed_bounds
    )

    fitness = (
        0.40 * normalized["travel_time"]
        + 0.30 * normalized["distance"]
        + 0.20 * normalized["congestion"]
        + 0.10 * normalized["emissions"]
    )

    return float(fitness)