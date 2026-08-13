export type Category =
  | "Microcontroller"
  | "Sensors"
  | "Prototyping"
  | "Passive"
  | "Power"
  | "Connector";

export interface Component {
  _id?: string;
  id?: string;
  sku: string;
  name: string;
  category: Category;
  price: number;
  stock: number;
  description: string;
  details: string;
  image?: string;
}