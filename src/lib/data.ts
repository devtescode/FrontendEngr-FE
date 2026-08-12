 export type Category = "Microcontroller" | "Sensors" | "Prototyping" | "Passive" | "Power" | "Connector";

export interface Component {
  id: string;
  sku: string;
  name: string;
  category: Category;
  price: number;
  stock: number;
  description: string;
  details: string;
  emoji: string;
}

export const SEED_COMPONENTS: Component[] = [
  { id: "arduino-uno-r3", sku: "MCU-001", name: "Arduino Uno R3", category: "Microcontroller", price: 12500, stock: 12,
    emoji: "🎛️",
    description: "The essential board for student robotics and IoT projects.",
    details: "ATmega328P, 14 digital pins, 6 analog inputs, USB-B. Includes header pins." },
  { id: "esp32-wroom", sku: "MCU-002", name: "ESP32-WROOM-32D", category: "Microcontroller", price: 8200, stock: 28,
    emoji: "📡",
    description: "WiFi + Bluetooth dual-core MCU for connected projects.",
    details: "Xtensa LX6 dual-core 240MHz, WiFi 802.11 b/g/n, BT 4.2." },
  { id: "hc-sr04", sku: "SNS-004", name: "Ultrasonic Sensor HC-SR04", category: "Sensors", price: 1200, stock: 45,
    emoji: "📏",
    description: "High precision distance measuring module.",
    details: "Range 2cm–400cm, accuracy ±3mm, 5V operation." },
  { id: "dht22", sku: "SNS-007", name: "DHT22 Temp & Humidity", category: "Sensors", price: 2400, stock: 22,
    emoji: "🌡️",
    description: "Digital temperature & humidity sensor.",
    details: "-40 to 80°C, 0–100% RH, single-wire digital." },
  { id: "breadboard-kit", sku: "PRO-010", name: "Lab Prototyping Kit", category: "Prototyping", price: 4800, stock: 4,
    emoji: "🧪",
    description: "Full breadboard, 65 jumper wires, power module.",
    details: "830-point breadboard + MB-102 power supply + assorted wires." },
  { id: "jumper-wires", sku: "CON-091", name: "Jumper Wires (40-pack M-M)", category: "Connector", price: 850, stock: 120,
    emoji: "🔌",
    description: "Multi-colored male-to-male jumper wires.",
    details: "20cm length, dupont connectors, 40 pieces assorted colors." },
  { id: "resistor-kit", sku: "PAS-102", name: "Resistor Kit (300 pcs)", category: "Passive", price: 2200, stock: 14,
    emoji: "⚡",
    description: "Assorted 1/4W metal film resistors.",
    details: "30 values, 10 pcs each, 1% tolerance." },
  { id: "led-pack", sku: "PAS-201", name: "LED Variety Pack (100)", category: "Passive", price: 1500, stock: 60,
    emoji: "💡",
    description: "Red, green, blue, yellow & white 5mm LEDs.",
    details: "20 of each color, standard brightness." },
  { id: "servo-sg90", sku: "PWR-301", name: "Servo Motor SG90", category: "Power", price: 1800, stock: 30,
    emoji: "⚙️",
    description: "Micro servo motor for robotics.",
    details: "180° rotation, 1.8kg/cm torque, 4.8–6V." },
];