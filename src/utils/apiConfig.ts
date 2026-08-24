import { add } from "date-fns";
import { baseURL } from "../../config";
// console.log('Base URL:', baseURL)
export const API_URLS = {
    userlogin: `${baseURL}/engineering/userlogin`,
    usersignup: `${baseURL}/engineering/usersignup`,
    cart: `${baseURL}/engineering/cart`,
    //  `${BASE_URL}/engineering/addtocart`,
    addtocart: `${baseURL}/engineering/addtocart`,
};