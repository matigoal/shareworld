const express = require("express");
const multer = require("multer");
const OfferController = require("../controllers/OfferController");
const ImageUploader = require("../helpers/imagesUploader");
const Address = require("../models/Address");
const Offer = require("../models/Offer");
const User = require("../models/User");

const offerRouter = express.Router();

/* callback OfferController functions */

/* Get all offers */
offerRouter.get("/", OfferController.index);

/* Search offers by name, category, status, distance(perimeter), date(creation) */
//search?title=&category=&status=[]&distance=&days=
//search?title&category&status&distance&days
offerRouter.get("/search", OfferController.searchOffers);

/* Get an offer by Id */
offerRouter.get("/:id", OfferController.getOffer);

/* Test  */
offerRouter.get("/by/date/local", OfferController.getOfferByDateLocal);

// Create a offer with images(mandatory)
offerRouter.post(
  "/",
  multer(ImageUploader).array("images", 3),
  OfferController.createOffer
);

// Update offer
offerRouter.put("/update/:offerId", OfferController.updateOffer);

offerRouter.delete("/:offerId", async (req, res) => {
  const { offerId } = req.params;
  const offer = await Offer.findOne({ where: { id: offerId } });
  const addressId = offer.exchange_address_id;
  await Offer.destroy({ where: { id: offerId } });
  const userByAddress = await User.findAll({
    where: { address_id: addressId },
  });
  if (userByAddress.length === 0) {
    await Address.destroy({ where: { id: addressId } });
  }
});

module.exports = offerRouter;
