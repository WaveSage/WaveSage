"use client";

import { useState } from "react";
import type {
  BoardType,
  EquipmentRecommendation,
  FinSetup,
  Inventory,
  SkillLevel,
  Surfboard,
} from "@/lib/types";
import { saveInventory } from "@/lib/inventory";

interface InventoryPanelProps {
  inventory: Inventory;
  onChange: (inventory: Inventory) => void;
  recommendations: EquipmentRecommendation[];
}

type Tab = "boards" | "fins";

export function InventoryPanel({
  inventory,
  onChange,
  recommendations,
}: InventoryPanelProps) {
  const [tab, setTab] = useState<Tab>("boards");
  const [boardName, setBoardName] = useState("");
  const [boardType, setBoardType] = useState<BoardType>("shortboard");
  const [lengthFt, setLengthFt] = useState("6.0");
  const [volumeL, setVolumeL] = useState("30");
  const [finSetup, setFinSetup] = useState<FinSetup>("thruster");

  function updateInventory(next: Inventory) {
    saveInventory(next);
    onChange(next);
  }

  function addBoard() {
    if (!boardName.trim()) return;

    const board: Surfboard = {
      id: crypto.randomUUID(),
      name: boardName.trim(),
      type: boardType,
      lengthFt: Number(lengthFt),
      volumeL: Number(volumeL),
      finSetup,
    };

    updateInventory({
      ...inventory,
      boards: [...inventory.boards, board],
    });

    setBoardName("");
  }

  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2>Your Quiver</h2>

      <label className="muted" htmlFor="skill">
        Skill level
      </label>
      <select
        id="skill"
        value={inventory.skillLevel}
        onChange={(event) =>
          updateInventory({
            ...inventory,
            skillLevel: event.target.value as SkillLevel,
          })
        }
        style={{ width: "100%", marginBottom: "1rem" }}
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>

      <div className="tabs">
        <button
          type="button"
          className={tab === "boards" ? "active" : ""}
          onClick={() => setTab("boards")}
        >
          Boards ({inventory.boards.length})
        </button>
        <button
          type="button"
          className={tab === "fins" ? "active" : ""}
          onClick={() => setTab("fins")}
        >
          Fins ({inventory.fins.length})
        </button>
      </div>

      {tab === "boards" ? (
        <>
          <div className="inventory-list">
            {inventory.boards.map((board) => (
              <div key={board.id} className="inventory-item">
                <h3>{board.name}</h3>
                <p className="muted">
                  {board.type} · {board.lengthFt}&apos; · {board.volumeL}L ·{" "}
                  {board.finSetup}
                </p>
              </div>
            ))}
          </div>

          <div className="inventory-form">
            <input
              placeholder="Board name"
              value={boardName}
              onChange={(event) => setBoardName(event.target.value)}
            />
            <select
              value={boardType}
              onChange={(event) =>
                setBoardType(event.target.value as BoardType)
              }
            >
              <option value="shortboard">Shortboard</option>
              <option value="fish">Fish</option>
              <option value="hybrid">Hybrid</option>
              <option value="funboard">Funboard</option>
              <option value="longboard">Longboard</option>
              <option value="gun">Gun</option>
              <option value="softboard">Softboard</option>
            </select>
            <input
              placeholder="Length (ft)"
              value={lengthFt}
              onChange={(event) => setLengthFt(event.target.value)}
            />
            <input
              placeholder="Volume (L)"
              value={volumeL}
              onChange={(event) => setVolumeL(event.target.value)}
            />
            <select
              value={finSetup}
              onChange={(event) =>
                setFinSetup(event.target.value as FinSetup)
              }
            >
              <option value="thruster">Thruster</option>
              <option value="twin">Twin</option>
              <option value="quad">Quad</option>
              <option value="2+1">2+1</option>
              <option value="single">Single</option>
            </select>
            <button type="button" onClick={addBoard}>
              Add board
            </button>
          </div>
        </>
      ) : (
        <div className="inventory-list">
          {inventory.fins.map((fin) => (
            <div key={fin.id} className="inventory-item">
              <h3>{fin.name}</h3>
              <p className="muted">
                {fin.setup} · {fin.size} · {fin.template}
              </p>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <h2>Top picks</h2>
          <div className="inventory-list">
            {recommendations.map((rec) => (
              <div key={rec.board.id} className="inventory-item">
                <h3>
                  {rec.board.name}{" "}
                  <span className="badge">{rec.fit}</span>
                </h3>
                <p className="muted">{rec.howItWouldFeel}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
