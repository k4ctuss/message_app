export const E2E_PASSWORD = "E2ePass1!";

export function uniqueAccount(role) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const names = {
    owner: "Alice Owner",
    member: "Bob Member",
    visitor: "Carla Visitor",
  };

  return {
    name: names[role] || "Dana User",
    email: `e2e.${role}.${stamp}@example.com`,
    password: E2E_PASSWORD,
  };
}

export function uniqueGroupName(prefix = "E2e Group") {
  return `${prefix} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
