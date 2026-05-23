function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

const now = new Date();
const monday = getMonday(now);
console.log("Current Date (local):", now.toString());
console.log("Current Date (ISO):", now.toISOString());
console.log("getMonday Date (local):", monday.toString());
console.log("getMonday Date (ISO):", monday.toISOString());
console.log("getMonday split('T')[0]:", monday.toISOString().split('T')[0]);
console.log("timezone offset:", now.getTimezoneOffset());
