"use client";

import { useMemo, useState } from "react";
import { getCoachPeriod } from "@/lib/coach-period";
import type {
  ChatMessage,
  CoachResponse,
  FinSet,
  Inventory,
  SurfConditions,
  Surfboard,
} from "@/lib/types";
import { Chat } from "@/components/Chat";
import {
  boardFromModel,
  findBoardModelByName,
  surfboardFromNameInput,
} from "@/lib/board-catalog";

interface BoardBuilderProps {
  inventory: Inventory;
  conditions: SurfConditions | null;
  favoriteSpotName: string | null;
  regionalConditions?: SurfConditions[];
}

export function BoardBuilder({
  inventory,
  conditions,
  favoriteSpotName,
  regionalConditions,
}: BoardBuilderProps) {
  const spotLabel = favoriteSpotName ?? conditions?.spot.name ?? "your spot";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Type a board make and model (e.g. JS Industries Xero Gravity), set length and volume if you want, then ask how it would ride at ${spotLabel}. Sage uses shaper specs when the model is in our catalog.`,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const [boardModelInput, setBoardModelInput] = useState("");
  const [lengthFt, setLengthFt] = useState("6.0");
  const [volumeL, setVolumeL] = useState("30");
  const [finName, setFinName] = useState("");

  const matchedModel = useMemo(
    () => findBoardModelByName(boardModelInput),
    [boardModelInput]
  );

  function handleBoardModelChange(value: string) {
    setBoardModelInput(value);
    const model = findBoardModelByName(value);
    if (model) {
      const spec = boardFromModel(model);
      setLengthFt(String(spec.lengthFt));
      setVolumeL(String(spec.volumeL));
    }
  }

  function buildHypotheticalBoard(): Surfboard {
    return surfboardFromNameInput(
      boardModelInput,
      Number(lengthFt) || 6,
      Number(volumeL) || undefined
    );
  }

  function buildHypotheticalFin(board: Surfboard): FinSet {
    return {
      id: "hypothetical-fin",
      name: finName.trim() || `${board.finSetup} fins`,
      setup: board.finSetup,
      size: "M",
      template:
        board.finSetup === "quad" || board.finSetup === "twin"
          ? "pivot"
          : "performance",
    };
  }

  async function handleSend(message: string) {
    if (!boardModelInput.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        {
          role: "assistant",
          content: "Enter a board make and model first so Sage knows what to evaluate.",
        },
      ]);
      return;
    }

    const priorMessages = messages;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    const board = buildHypotheticalBoard();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          inventory,
          regionalConditions,
          coachPeriod: getCoachPeriod(),
          conversationHistory: priorMessages,
          hypotheticalSetup: {
            board,
            fin: buildHypotheticalFin(board),
          },
        }),
      });

      const data = (await response.json()) as CoachResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry — ${text}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid builder-grid">
      <section className="panel">
        <h2>Board builder</h2>
        <p className="muted">
          Type any make and model — Sage matches shaper specs when available and
          evaluates the ride at <strong>{spotLabel}</strong>.
        </p>

        <div className="builder-form">
          <h3>Board</h3>
          <input
            placeholder="Make & model (e.g. JS Industries Xero Gravity)"
            value={boardModelInput}
            onChange={(event) => handleBoardModelChange(event.target.value)}
          />
          {matchedModel ? (
            <p className="model-preview">{matchedModel.shaperNotes}</p>
          ) : boardModelInput.trim() ? (
            <p className="model-preview muted">
              Model not in catalog yet — Sage will give a general read. The
              catalog includes 130+ models from Slater Designs, Firewire, JS,
              Lost, Rusty, Album, ONE, Revolver, CI, Pyzel, Chemistry, Borst,
              Timmy Patterson, Christenson, and Hayden Shapes.
            </p>
          ) : null}
          <div className="builder-row">
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
          </div>

          <h3>Fins (optional)</h3>
          <input
            placeholder="Fin set name (defaults to board's fin setup)"
            value={finName}
            onChange={(event) => setFinName(event.target.value)}
          />
        </div>
      </section>

      <section className="panel">
        <h2>Ask the Sage</h2>
        <Chat
          messages={messages}
          loading={loading}
          onSend={handleSend}
          placeholder={`How would this ride at ${spotLabel} today?`}
        />
      </section>
    </div>
  );
}
