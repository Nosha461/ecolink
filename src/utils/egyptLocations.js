export const EGYPT_GOVERNORATES = [
  {
    value: "Cairo",
    areas: ["Maadi", "Nasr City", "Heliopolis", "New Cairo", "Downtown", "Shubra", "Mokattam"],
  },
  {
    value: "Giza",
    areas: ["Sheikh Zayed", "6th of October", "Dokki", "Mohandessin", "Haram", "Faisal"],
  },
  {
    value: "Alexandria",
    areas: ["Smouha", "Sidi Gaber", "Miami", "Stanley", "Agami"],
  },
  {
    value: "Qalyubia",
    areas: ["Shubra El Kheima", "Obour", "Banha"],
  },
  {
    value: "Dakahlia",
    areas: ["Mansoura", "Talkha"],
  },
  {
    value: "Sharqia",
    areas: ["Zagazig", "10th of Ramadan"],
  },
  {
    value: "Gharbia",
    areas: ["Tanta", "Mahalla"],
  },
  {
    value: "Port Said",
    areas: ["Port Fouad", "El Arab"],
  },
  {
    value: "Suez",
    areas: ["Arbaeen", "Faisal"],
  },
  {
    value: "Ismailia",
    areas: ["Ismailia City", "Fayed"],
  },
];

export function getAreasForGovernorate(governorate) {
  return EGYPT_GOVERNORATES.find((item) => item.value === governorate)?.areas || [];
}
