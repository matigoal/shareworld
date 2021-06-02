const Offer = require("../models/Offer");
const PictureOffer = require("../models/PictureOffer");
const User = require("../models/User");
const Address = require("../models/Address");
const Category = require("../models/Category");
const offerRepository = require("../repositories/OfferRepository");
const dateHelpers = require("../helpers/dateHelpers");
const haversine = require("../helpers/haversine");
const numbers = require("../helpers/numbers");
const OfferDto = require("../Dto/OfferDto");
const NodeGeocoder = require("node-geocoder");

module.exports = {
  async getAllOffers() {
    const offers = await Offer.findAll();

    const offerResults = await Promise.all(
      offers.map(async (offr) => {
        const offerDtoOut = await OfferDto.OfferToDto(offr);
        return offerDtoOut;
      })
    );

    return offerResults;
  },

  async getOffer(id) {
    try {
      const offer = await Offer.findByPk(id);

      if (offer == null) {
        return null;
      }

      const offerDto = await OfferDto.OfferToDto(offer);
      return offerDto;
    } catch (error) {
      const jsonRes = {
        message:
          error.message || "Some error occurred while searching the offer.",
      };
      return jsonRes;
    }
  },

  async getOffersByDateAndLocal(date, local) {
    const jsonEx = {
      local: local,
      date: date,
    };
    return jsonEx;
  },

  /**
   * Create an offer
   * @param {*} offer Object
   * {
   *      label: String,
   *      description: String,
   *      display_phone: Boolean
   *      display_mail: Boolean
   *      state: String
   *      owner_id: INTEGER
   *      is_owner_address: Boolean
   *      exchange_address: Object
   *      category_id: INTEGER
   *      images: DataFile[]
   * }
   * @param {*} files images: DataFile[]
   * @param {*} baseUrl String
   * @returns
   */
  async serviceCreateOffer(offer, files, baseUrl) {
    const addressOffer = JSON.parse(offer.exchange_address);
    var address = await Address.findByPk(addressOffer.id);

    if (address === null) {
      const newAdress = {
        street: addressOffer.street,
        city: addressOffer.city,
        zipcode: addressOffer.zipcode,
        complement: addressOffer.complement,
        number: addressOffer.number,
        latitude: addressOffer.latitude,
        longitude: addressOffer.longitude,
      };

      // Create a new adress
      address = await Address.create(newAdress);
    }

    const product = {
      label: offer.label,
      description: offer.description,
      display_phone: offer.display_phone ? offer.display_phone : 0,
      display_mail: offer.display_mail ? offer.display_mail : 0,
      state: offer.state,
      status: "En cours(ouverte)",
      owner_id: offer.owner_id,
      exchange_address_id: address.id,
      category_id: offer.category_id,
      is_owner_address: offer.is_owner_address ? offer.is_owner_address : 0,
    };

    // Checks the conditions
    const owner = await User.findByPk(product.owner_id);

    const category = await Category.findByPk(product.category_id);

    if (owner !== null && address !== null && category !== null) {
      try {
        // Create offer
        const offer = await Offer.create(product);

        const urls = [];
        const pictures = [];

        files.forEach((e, i) => {
          urls.push(`${baseUrl}/${e.filename}`);
          pictures.push({
            name: `${product.label} ${i + 1}`,
            url: `${baseUrl}/${e.filename}`,
            offer_id: offer.id,
          });
        });

        // Create images
        const pictureOffer = await PictureOffer.bulkCreate(pictures);

        if (offer === null || pictureOffer === null) {
          return null;
        }

        //  return success message;
        const offerDto = await OfferDto.OfferToDto(offer);
        return offerDto;
      } catch (error) {
        const jsonRes = {
          message:
            error.message || "Some error occurred while creating the offer.",
        };
        return jsonRes;
      }
    }
    return null;
  },

  /**
   * Search Offer
   * @param {Object} params search, category, state[], days, distance(Km), latitude, longitude, page_size, page_number, sort_by
   * @returns Json
   */
  async serviceSearchOffer(params) {
    const search =
      params.search && params.search.trim().length > 0
        ? params.search.trim()
        : false;
    const category = Number.isInteger(parseInt(params.category))
      ? parseInt(params.category)
      : false;

    var states =
      Array.isArray(params.state) && params.state.length > 0
        ? params.state
        : false;

    if (states) {
      states = states.map((st) => {
        return st.trim();
      });
    }

    const date = Number.isInteger(parseInt(params.days))
      ? dateHelpers.getDateBeforeDays(parseInt(params.days))
      : false;

    const page_number = Number.isInteger(parseInt(params.page_number))
      ? parseInt(params.page_number)
      : false;

    const page_size = Number.isInteger(parseInt(params.page_size))
      ? parseInt(params.page_size)
      : false;

    const sort =
      params.sort_by && params.sort_by.trim().length > 0
        ? params.sort_by.trim()
        : false;

    const offset =
      page_number && page_size ? (page_number - 1) * page_size : false;

    const distance = Number.isInteger(parseInt(params.distance))
      ? parseInt(params.distance)
      : false;
    const latitude = numbers.isFloat(parseFloat(params.latitude))
      ? parseFloat(params.latitude)
      : false;
    const longitude = numbers.isFloat(parseFloat(params.longitude))
      ? parseFloat(params.longitude)
      : false;

    // Params condtions
    const conditions = {
      search: search,
      category: category,
      state: states,
      created_date: date,
      distance: distance,
      lat: latitude,
      long: longitude,
      limit: page_size,
      offset: offset,
      sort_by: sort,
    };

    const pointA = {
      longitude: longitude,
      latitude: latitude,
    };

    try {
      const offers = await offerRepository.repositorySearchOffers(conditions);
      const countOffers = await offerRepository.repositoryCountSearchOffers(
        conditions
      );

      if (offers === null || countOffers === null) {
        return null;
      }

      const totalOffers = parseInt(countOffers[0].count);

      const offerResults = await Promise.all(
        offers.map(async (offr) => {
          var pointB = {
            latitude: parseFloat(offr.latitude),
            longitude: parseFloat(offr.longitude),
          };

          const offerDtoOut = await OfferDto.OfferToDto(offr);

          offerDtoOut.exchange_address.distance =
            latitude && longitude
              ? await haversine.getDistanceBetween2Points(pointA, pointB)
              : null;

          return offerDtoOut;
        })
      );

      const results = {};

      // Pagination info
      results.pagination = {
        current_page: page_number && offset ? page_number : 1,
        page_size: page_size ? page_size : 0,
        total_pages:
          totalOffers && page_size ? Math.ceil(totalOffers / page_size) : 0,
      };

      results.results = {
        offers: offerResults,
      };

      return results;
    } catch (error) {
      const jsonRes = {
        message:
          error.message || "Some error occurred while searching the offers.",
      };

      return jsonRes;
    }
  },

  async serviceUpdateOffer(id, newOffer) {
    const offerUpdated = await Offer.findOne({ where: { id: id } });
    if (newOffer.is_owner_address) {
      // UPDATE OFFER
      await offerUpdated.update({
        label: newOffer.label,
        description: newOffer.description,
        state: newOffer.state,
        display_phone: newOffer.display_phone,
        display_mail: newOffer.display_mail,
        is_owner_address: true,
        category_id: newOffer.category_id,
        exchange_address_id: newOffer.owner.address.id,
      });

      // DESTROY OLD ADDRESS OF OFFER IF IS NOT ADDRESS OF OWNER
      if (newOffer.owner.address.id !== newOffer.exchange_address.id) {
        await Address.destroy({
          where: {
            id: newOffer.exchange_address.id,
          },
        });
      }
    } else {
      // DESTROY OLD ADDRESS IF IS NOT ADDRESS OF OWNER
      const oldAddressId = newOffer.exchange_address.id;
      const userByAddress = await User.findAll({
        where: { address_id: oldAddressId },
      });
      if (userByAddress.length === 0) {
        await Address.destroy({ where: { id: oldAddressId } });
      }

      // CREATE NEW ADDRESS
      const geocoder = NodeGeocoder({
        provider: "openstreetmap",
      });
      const address =
        newOffer.exchange_address.number.toString() +
        " " +
        newOffer.exchange_address.street +
        " " +
        newOffer.exchange_address.city;
      const res = await geocoder.geocode(address.toLowerCase());
      const newAddress = await Address.create({
        street: newOffer.exchange_address.street,
        city: newOffer.exchange_address.city,
        zipcode: newOffer.exchange_address.zipcode,
        complement: newOffer.exchange_address.complement,
        number: newOffer.exchange_address.number,
        latitude: res[0].latitude,
        longitude: res[0].longitude,
      });

      // UPDATE OFFER
      await offerUpdated.update({
        label: newOffer.label,
        description: newOffer.description,
        state: newOffer.state,
        display_phone: newOffer.display_phone,
        display_mail: newOffer.display_mail,
        is_owner_address: false,
        category_id: newOffer.category_id,
        exchange_address_id: newAddress.id,
      });
    }
  },
};
