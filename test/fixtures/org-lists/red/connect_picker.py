import html
from urllib.parse import urlencode


def org_picker(connector, title, orgs):
    admin = [o for o in orgs if o.get("role") in ("owner", "admin")]
    items = "".join(
        '<li><a class="org" href="{}">{}</a></li>'.format(
            html.escape(f"/api/connect/{connector}/start?" + urlencode({"org": o["id"]})),
            html.escape(str(o.get("name") or o["id"])),
        )
        for o in admin
    )
    return f"<!doctype html><h1>Connect {title} to which organization?</h1><ul>{items}</ul>"
