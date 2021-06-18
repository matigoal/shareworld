import NsAddress from "./NsAddress";
import NsUserWantOffers from "./NsUserWantOffers";

declare namespace NsUser {
  export interface IUserWantedOfferData {
    id: number;
    first_name: string;
    last_name: string;
    // full_name: string;
    phone: string;
    // url_avatar: string;
    // credit: number;
    mail: string;
    note: string;
    // number_notes: number;
    // address: NsAddress.IAddress;
    user_want_offers?: NsUserWantOffers.IUserWantOffers;
  }
}

export default NsUser;
