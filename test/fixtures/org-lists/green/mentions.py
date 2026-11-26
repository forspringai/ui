def describe(orgs):
    """Choose an organization: the CLI's own prompt text, documented here only."""
    # Connect it to which organization? (a comment)
    return ", ".join(o["name"] for o in orgs)
