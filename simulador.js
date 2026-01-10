/* =========================
   Sebastian — Cartas & Técnicas
   - Taumaturgia (Pressão + Runas)
   - Volumen Hydrargyrum
   ========================= */

(() => {
  // ---------- DOM ----------
  const deckEl = document.getElementById("deck");
  const flyingCard = document.getElementById("flyingCard");

  const fillHandBtn = document.getElementById("fillHandBtn");
  const drawOneBtn = document.getElementById("drawOneBtn");
  const resetBtn = document.getElementById("resetBtn");

  const soundToggle = document.getElementById("soundToggle");
  const handLimitInput = document.getElementById("handLimit");
  const modeSelect = document.getElementById("modeSelect");
  const modeHint = document.getElementById("modeHint");

  const handGrid = document.getElementById("handGrid");
  const handCount = document.getElementById("handCount");

  const seqSlots = document.getElementById("seqSlots");

  const actionsHint = document.getElementById("actionsHint");
  const actionsList = document.getElementById("actionsList");

  const resultTitle = document.getElementById("resultTitle");
  const resultTags = document.getElementById("resultTags");
  const resultText = document.getElementById("resultText");
  const targetsCountInput = document.getElementById("targetsCount");
  const artsModeSelect = document.getElementById("artsMode");

  const rollDamageBtn = document.getElementById("rollDamageBtn");
  const executeBtn = document.getElementById("executeBtn");
  const damageOut = document.getElementById("damageOut");

  // ---------- State ----------
  const TYPES = ["quick", "arts", "buster"];
  const ICONS = {
    quick: "assets/card_quick.svg",
    arts: "assets/card
