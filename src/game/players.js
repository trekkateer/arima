// Creates a new player object with a unique ID, name, colorID
// Name defaults to the color ("Gold"/"Silver") when none is given
export function createPlayer(colorID, name) {
  const colorName = colorID === "Au" ? "gold" : "silver";
  return {
    id: crypto.randomUUID(),
    colorID,
    colorName,
    name: name ?? (colorID === "Au" ? "Gold" : "Silver")
  };
}
