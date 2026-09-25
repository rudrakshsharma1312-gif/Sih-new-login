import numpy as np

from .qpso import qpso_update
from .objective import evaluate_particle


def run_qpso(
    destinations,
    n_vehicles,
    index_to_node,
    graph,
    depot_node,
    reference_bounds,
    n_particles=25,
    n_iterations=200,
    dimensions=12,
    beta_max=1.0,
    beta_min=0.5,
    seed=None
):
    """
    Run QPSO for the multi-vehicle routing problem.
    """

    if seed is not None:
        np.random.seed(seed)

    positions = np.random.uniform(
        -1.0,
        1.0,
        (
            n_particles,
            dimensions
        )
    )

    evaluations = [
        evaluate_particle(
            particle=p,
            destinations=destinations,
            n_vehicles=n_vehicles,
            index_to_node=index_to_node,
            graph=graph,
            depot_node=depot_node,
            reference_bounds=reference_bounds
        )
        for p in positions
    ]

    fitness = np.array([
        evaluation["fitness"]
        for evaluation in evaluations
    ])

    pbest_positions = positions.copy()
    pbest_fitness = fitness.copy()

    best_index = np.argmin(
        pbest_fitness
    )

    gbest_position = (
        pbest_positions[
            best_index
        ].copy()
    )

    gbest_fitness = float(
        pbest_fitness[
            best_index
        ]
    )

    convergence = [
        gbest_fitness
    ]

    for iteration in range(
        n_iterations
    ):

        if n_iterations > 1:
            beta = (
                beta_max
                - (
                    beta_max
                    - beta_min
                )
                * iteration
                / (n_iterations - 1)
            )
        else:
            beta = beta_min

        mbest = np.mean(
            pbest_positions,
            axis=0
        )

        positions = qpso_update(
            positions,
            pbest_positions,
            gbest_position,
            mbest,
            beta
        )

        evaluations = [
            evaluate_particle(
                particle=p,
                destinations=destinations,
                n_vehicles=n_vehicles,
                index_to_node=index_to_node,
                graph=graph,
                depot_node=depot_node,
                reference_bounds=reference_bounds
            )
            for p in positions
        ]

        fitness = np.array([
            evaluation["fitness"]
            for evaluation in evaluations
        ])

        improved = (
            fitness
            < pbest_fitness
        )

        pbest_positions[
            improved
        ] = positions[
            improved
        ]

        pbest_fitness[
            improved
        ] = fitness[
            improved
        ]

        best_index = np.argmin(
            pbest_fitness
        )

        if (
            pbest_fitness[
                best_index
            ]
            < gbest_fitness
        ):
            gbest_fitness = float(
                pbest_fitness[
                    best_index
                ]
            )

            gbest_position = (
                pbest_positions[
                    best_index
                ].copy()
            )

        convergence.append(
            gbest_fitness
        )

    result = evaluate_particle(
        particle=gbest_position,
        destinations=destinations,
        n_vehicles=n_vehicles,
        index_to_node=index_to_node,
        graph=graph,
        depot_node=depot_node,
        reference_bounds=reference_bounds
    )

    return {
        "best_fitness": gbest_fitness,
        "best_position": gbest_position,
        "convergence": convergence,
        "result": result
    }