const PictureOfferService = require("../services/PictureOfferService");

module.exports = {
  async getAllPicturesByOffer(req, res, next) {
    const { offerId } = req.params;
    console.log(offerId);
    const response = await PictureOfferService.serviceGetAllPicturesByOffer(
      offerId
    );
    console.log(response);
    return res.status(201).json(response);
  },

  async createPicture(req, res, next) {
    const { id } = req.body;
    const image = req.file;
    if (id && image) {
      const response = await PictureOfferService.serviceCreatePicture(
        id,
        image
      );
      console.log(response);
      if (!response) {
        return res.status(500).json({
          message: "Some error occurred while creating the picture.",
        });
      }
      return res.status(201).json(response);
    }
  },

  async deletePicture(req, res, next) {
    const { name } = req.params;
    if (name) {
      const response = await PictureOfferService.serviceDeletePicture(name);
      console.log(response);
      if (!response) {
        return res.status(500).json({
          message: "Some error occurred while creating the picture.",
        });
      }
      return res.status(201).json(response);
    }
  },
};
