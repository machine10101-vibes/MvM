#!/usr/bin/env python3
"""Pack the Rojo src tree into a Studio-openable .rbxlx place."""

from __future__ import annotations

import html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
OUT = ROOT / "MVM.rbxlx"

REF = 0


def rid() -> str:
    global REF
    REF += 1
    return f"RBX{REF}"


def cdata(text: str) -> str:
    return "<![CDATA[" + text.replace("]]>", "]]]]><![CDATA[>") + "]]>"


def props(body: str) -> str:
    return f"    <Properties>\n{body}    </Properties>\n"


def item(class_name: str, name: str, extra_props: str = "", children: str = "") -> str:
    ref = rid()
    inner = f'      <string name="Name">{html.escape(name)}</string>\n{extra_props}'
    return (
        f'  <Item class="{class_name}" referent="{ref}">\n'
        f"{props(inner)}"
        f"{children}"
        f"  </Item>\n"
    )


def script_item(class_name: str, name: str, source: str) -> str:
    return item(
        class_name,
        name,
        f'      <ProtectedString name="Source">{cdata(source)}</ProtectedString>\n',
    )


def folder(name: str, children: str) -> str:
    return item("Folder", name, children=children)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def pack_dir(path: Path) -> str:
    chunks: list[str] = []
    if not path.exists():
        return ""
    for child in sorted(path.iterdir(), key=lambda p: p.name.lower()):
        if child.name.startswith("."):
            continue
        if child.is_dir():
            chunks.append(folder(child.name, pack_dir(child)))
            continue
        if child.suffix != ".lua":
            continue
        source = read(child)
        stem = child.name
        if stem.endswith(".server.lua"):
            chunks.append(script_item("Script", stem[: -len(".server.lua")], source))
        elif stem.endswith(".client.lua"):
            chunks.append(script_item("LocalScript", stem[: -len(".client.lua")], source))
        else:
            chunks.append(script_item("ModuleScript", child.stem, source))
    return "".join(chunks)


def main() -> None:
    shared = pack_dir(SRC / "ReplicatedStorage" / "Shared")
    server = pack_dir(SRC / "ServerScriptService")
    client = pack_dir(SRC / "StarterPlayer" / "StarterPlayerScripts")

    spawn = item(
        "SpawnLocation",
        "HangarSpawn",
        '      <bool name="Anchored">true</bool>\n'
        '      <float name="Duration">0</float>\n'
        '      <bool name="Neutral">true</bool>\n'
        '      <Vector3 name="Size">16 1 16</Vector3>\n'
        '      <CoordinateFrame name="CFrame">0 3.6 -70 1 0 0 0 1 0 0 0 1</CoordinateFrame>\n',
    )

    workspace = item("Workspace", "Workspace", children=spawn)
    lighting = item(
        "Lighting",
        "Lighting",
        '      <float name="Brightness">2.2</float>\n'
        '      <float name="ClockTime">16.4</float>\n'
        '      <float name="FogEnd">1200</float>\n'
        '      <float name="FogStart">180</float>\n',
    )
    rs = item("ReplicatedStorage", "ReplicatedStorage", children=folder("Shared", shared))
    sss = item("ServerScriptService", "ServerScriptService", children=server)
    sps = item("StarterPlayerScripts", "StarterPlayerScripts", children=client)
    starter_player = item("StarterPlayer", "StarterPlayer", children=sps)
    players = item("Players", "Players")
    starter_gui = item("StarterGui", "StarterGui")
    sound = item("SoundService", "SoundService")
    chat = item("Chat", "Chat")
    http = item("HttpService", "HttpService", '      <bool name="HttpEnabled">false</bool>\n')

    xml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n'
        "  <External>null</External>\n"
        "  <External>nil</External>\n"
        f"{workspace}{lighting}{rs}{sss}{starter_player}{players}{starter_gui}{sound}{chat}{http}"
        "</roblox>\n"
    )
    OUT.write_text(xml, encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
