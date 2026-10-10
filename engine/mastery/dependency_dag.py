import networkx as nx

def validate_dependency_dag(units: list) -> None:
    """Ensures the prerequisite graph has no circular loops."""
    dag = nx.DiGraph()
    for u in units:
        dag.add_node(u.unit_id)
        for dep_id in u.depends_on:
            dag.add_edge(dep_id, u.unit_id)
            
    if not nx.is_directed_acyclic_graph(dag):
        cycles = list(nx.simple_cycles(dag))
        raise ValueError(f"Circular dependency detected in curriculum: {cycles}")