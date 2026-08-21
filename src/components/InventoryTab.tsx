"use client";

import { useState } from "react";
import type {
  BoardBuild,
  BoardType,
  FinSetup,
  FinSet,
  Inventory,
  SkillLevel,
  Surfboard,
} from "@/lib/types";
import { saveInventory } from "@/lib/inventory";
import {
  boardFromFormValues,
  createBoardId,
  formatBoardDimensions,
  validateBoardForm,
} from "@/lib/board-dimensions";
import { getBoardModelById } from "@/lib/board-catalog";

interface InventoryTabProps {
  inventory: Inventory;
  onChange: (inventory: Inventory) => void;
}

type Section = "boards" | "fins" | "builds";

const BOARD_TYPE_OPTIONS: { value: BoardType; label: string }[] = [
  { value: "shortboard", label: "Shortboard" },
  { value: "fish", label: "Fish" },
  { value: "groveler", label: "Groveler" },
  { value: "midlength", label: "Mid-Length" },
  { value: "longboard", label: "Longboard" },
];

function boardTypeLabel(type: BoardType): string {
  return BOARD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function InventoryTab({ inventory, onChange }: InventoryTabProps) {
  const [section, setSection] = useState<Section>("boards");

  const [boardName, setBoardName] = useState("");
  const [boardType, setBoardType] = useState<BoardType>("shortboard");
  const [lengthFt, setLengthFt] = useState("6.0");
  const [widthIn, setWidthIn] = useState("19.5");
  const [thicknessIn, setThicknessIn] = useState("2.5");
  const [boardFinSetup, setBoardFinSetup] = useState<FinSetup>("thruster");

  const [finName, setFinName] = useState("");
  const [finSetup, setFinSetup] = useState<FinSetup>("thruster");
  const [finSize, setFinSize] = useState("M");
  const [finTemplate, setFinTemplate] =
    useState<FinSet["template"]>("neutral");

  const [buildName, setBuildName] = useState("");
  const [buildBoardId, setBuildBoardId] = useState("");
  const [buildFinId, setBuildFinId] = useState("");
  const [boardFormError, setBoardFormError] = useState<string | null>(null);

  function updateInventory(next: Inventory) {
    saveInventory(next);
    onChange(next);
  }

  function deleteBoard(id: string) {
    updateInventory({
      ...inventory,
      boards: inventory.boards.filter((b) => b.id !== id),
      builds: inventory.builds.filter((b) => b.boardId !== id),
    });
  }

  function deleteFin(id: string) {
    updateInventory({
      ...inventory,
      fins: inventory.fins.filter((f) => f.id !== id),
      builds: inventory.builds.filter((b) => b.finId !== id),
    });
  }

  function deleteBuild(id: string) {
    updateInventory({
      ...inventory,
      builds: inventory.builds.filter((b) => b.id !== id),
    });
  }

  function addBoard(event?: { preventDefault?: () => void }) {
    event?.preventDefault?.();

    const error = validateBoardForm({
      name: boardName,
      lengthFt,
      widthIn,
      thicknessIn,
    });
    if (error) {
      setBoardFormError(error);
      return;
    }

    const spec = boardFromFormValues(
      { name: boardName, lengthFt, widthIn, thicknessIn },
      boardType,
      boardFinSetup
    );
    if (!spec) {
      setBoardFormError("Could not read those dimensions. Check each field.");
      return;
    }

    const board: Surfboard = {
      id: createBoardId(),
      name: spec.name,
      type: spec.type as BoardType,
      lengthFt: spec.lengthFt,
      widthIn: spec.widthIn,
      thicknessIn: spec.thicknessIn,
      volumeL: spec.volumeL,
      finSetup: spec.finSetup as FinSetup,
    };

    updateInventory({
      ...inventory,
      boards: [...inventory.boards, board],
    });
    setBoardName("");
    setBoardFormError(null);
  }

  function addFin() {
    if (!finName.trim()) return;

    const fin: FinSet = {
      id: crypto.randomUUID(),
      name: finName.trim(),
      setup: finSetup,
      size: finSize,
      template: finTemplate,
    };

    updateInventory({
      ...inventory,
      fins: [...inventory.fins, fin],
    });
    setFinName("");
  }

  function addBuild() {
    if (!buildName.trim() || !buildBoardId || !buildFinId) return;

    const build: BoardBuild = {
      id: crypto.randomUUID(),
      name: buildName.trim(),
      boardId: buildBoardId,
      finId: buildFinId,
    };

    updateInventory({
      ...inventory,
      builds: [...inventory.builds, build],
    });
    setBuildName("");
  }

  function boardLabel(id: string) {
    return inventory.boards.find((b) => b.id === id)?.name ?? "Unknown board";
  }

  function finLabel(id: string) {
    return inventory.fins.find((f) => f.id === id)?.name ?? "Unknown fins";
  }

  return (
    <section className="panel inventory-tab">
      <h2>Your Quiver</h2>
      <p className="muted">
        Add boards, fins, and saved full builds for personalized Sage picks.
      </p>

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
        className="inventory-select"
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>

      <div className="tabs">
        <button
          type="button"
          className={section === "boards" ? "active" : ""}
          onClick={() => setSection("boards")}
        >
          Boards ({inventory.boards.length})
        </button>
        <button
          type="button"
          className={section === "fins" ? "active" : ""}
          onClick={() => setSection("fins")}
        >
          Fins ({inventory.fins.length})
        </button>
        <button
          type="button"
          className={section === "builds" ? "active" : ""}
          onClick={() => setSection("builds")}
        >
          Full build ({inventory.builds.length})
        </button>
      </div>

      {section === "boards" && (
        <>
          <div className="inventory-list">
            {inventory.boards.length === 0 ? (
              <p className="muted">No boards yet.</p>
            ) : (
              inventory.boards.map((board) => (
                <div key={board.id} className="inventory-item">
                  <div className="inventory-item-row">
                    <div>
                      <h3>{board.name}</h3>
                      <p className="muted">
                        {board.shaper ? `${board.shaper} · ` : ""}
                        {boardTypeLabel(board.type)} ·{" "}
                        {formatBoardDimensions(board)} · {board.finSetup}
                      </p>
                      {board.modelId && (
                        <p className="model-note">
                          {getBoardModelById(board.modelId)?.shaperNotes}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => deleteBoard(board.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            className="inventory-form"
            onSubmit={(event) => addBoard(event)}
          >
            <label className="muted" htmlFor="board-name">
              Board name
            </label>
            <input
              id="board-name"
              placeholder="e.g. JS Industries Xero Gravity"
              value={boardName}
              onChange={(event) => {
                setBoardName(event.target.value);
                if (boardFormError) setBoardFormError(null);
              }}
              required
            />
            <label className="muted" htmlFor="board-type">
              Type
            </label>
            <select
              id="board-type"
              value={boardType}
              onChange={(event) =>
                setBoardType(event.target.value as BoardType)
              }
            >
              {BOARD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="muted" htmlFor="board-length">
              Length (ft)
            </label>
            <input
              id="board-length"
              placeholder="6.1 or 6'2"
              value={lengthFt}
              onChange={(event) => {
                setLengthFt(event.target.value);
                if (boardFormError) setBoardFormError(null);
              }}
              required
            />
            <label className="muted" htmlFor="board-width">
              Width (in)
            </label>
            <input
              id="board-width"
              placeholder="19.5"
              value={widthIn}
              onChange={(event) => {
                setWidthIn(event.target.value);
                if (boardFormError) setBoardFormError(null);
              }}
              required
            />
            <label className="muted" htmlFor="board-thickness">
              Thickness (in)
            </label>
            <input
              id="board-thickness"
              placeholder="2.5"
              value={thicknessIn}
              onChange={(event) => {
                setThicknessIn(event.target.value);
                if (boardFormError) setBoardFormError(null);
              }}
              required
            />
            <label className="muted" htmlFor="board-fin-setup">
              Fin setup
            </label>
            <select
              id="board-fin-setup"
              value={boardFinSetup}
              onChange={(event) =>
                setBoardFinSetup(event.target.value as FinSetup)
              }
            >
              <option value="thruster">Thruster</option>
              <option value="twin">Twin</option>
              <option value="quad">Quad</option>
              <option value="2+1">2+1</option>
              <option value="single">Single</option>
            </select>
            {boardFormError && (
              <p className="form-error" role="alert">
                {boardFormError}
              </p>
            )}
            <button type="submit">Add board</button>
          </form>
        </>
      )}

      {section === "fins" && (
        <>
          <div className="inventory-list">
            {inventory.fins.length === 0 ? (
              <p className="muted">No fins yet.</p>
            ) : (
              inventory.fins.map((fin) => (
                <div key={fin.id} className="inventory-item">
                  <div className="inventory-item-row">
                    <div>
                      <h3>{fin.name}</h3>
                      <p className="muted">
                        {fin.setup} · {fin.size} · {fin.template}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => deleteFin(fin.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="inventory-form">
            <input
              placeholder="Fin set name"
              value={finName}
              onChange={(event) => setFinName(event.target.value)}
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
            <input
              placeholder="Size (S/M/L)"
              value={finSize}
              onChange={(event) => setFinSize(event.target.value)}
            />
            <select
              value={finTemplate}
              onChange={(event) =>
                setFinTemplate(event.target.value as FinSet["template"])
              }
            >
              <option value="performance">Performance</option>
              <option value="neutral">Neutral</option>
              <option value="drive">Drive</option>
              <option value="pivot">Pivot</option>
            </select>
            <button type="button" onClick={addFin}>
              Add fins
            </button>
          </div>
        </>
      )}

      {section === "builds" && (
        <>
          <div className="inventory-list">
            {inventory.builds.length === 0 ? (
              <p className="muted">No saved builds yet.</p>
            ) : (
              inventory.builds.map((build) => (
                <div key={build.id} className="inventory-item">
                  <div className="inventory-item-row">
                    <div>
                      <h3>{build.name}</h3>
                      <p className="muted">
                        {boardLabel(build.boardId)} + {finLabel(build.finId)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => deleteBuild(build.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {inventory.boards.length > 0 && inventory.fins.length > 0 ? (
            <div className="inventory-form">
              <input
                placeholder="Build name (e.g. Black's go-to)"
                value={buildName}
                onChange={(event) => setBuildName(event.target.value)}
              />
              <select
                value={buildBoardId}
                onChange={(event) => setBuildBoardId(event.target.value)}
              >
                <option value="">Select board</option>
                {inventory.boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
              <select
                value={buildFinId}
                onChange={(event) => setBuildFinId(event.target.value)}
              >
                <option value="">Select fins</option>
                {inventory.fins.map((fin) => (
                  <option key={fin.id} value={fin.id}>
                    {fin.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addBuild}>
                Save full build
              </button>
            </div>
          ) : (
            <p className="muted">
              Add at least one board and one fin set to save a full build.
            </p>
          )}
        </>
      )}
    </section>
  );
}
