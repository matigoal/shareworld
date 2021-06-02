const { QueryTypes } = require("sequelize");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    dialect: 'postgres',
    host: process.env.DB_HOST
});

module.exports = {

    /**
     * Repository: Search Offer
     * @param {Object} conditions search, category, state, created_date, distance, lat, long, limit, offset
     * @returns Json
     */
    async repositorySearchOffers(conditions) {

        const { search, category, state, created_date, distance, lat, long, limit, offset, sort_by } = conditions;

        var sql = `SELECT 
            ofrs.id, ofrs.label, ofrs.description, ofrs.display_phone, ofrs.display_mail,
            ofrs.state, ofrs.owner_id, ofrs.exchange_address_id, ofrs.category_id, ofrs.created_at,
             adrs.street, adrs.city, adrs.zipcode, adrs.complement, adrs.number, adrs.latitude, adrs.longitude
            FROM offers ofrs
            INNER JOIN addresses adrs
            ON ofrs.exchange_address_id = adrs.id `;

        var remplacements = {};

        const HAVERSINE_PART = " (6371 * acos(cos(radians(:latitude)) * cos(radians(adrs.latitude)) * cos(radians(adrs.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(adrs.latitude)))) ";

        // Status open 
        sql += 'WHERE status = :status ';

        // Remplacements
        remplacements.status = 'En cours(ouverte)';

        // Search string in label and description
        if (search) {
            sql += 'AND (label ILIKE :search_name OR description ILIKE :search_name)';
            remplacements.search_name = `%${search}%`;
        }

        // Search by category
        if (category) {
            sql += ' AND category_id = :category';
            remplacements.category = category;
        }

        // Search by offer state
        if (state) {
            sql += ' AND state IN (:state)';
            remplacements.state = state;
        }

        // Search offer by date before X days
        if (created_date) {
            sql += ' AND ofrs.created_at >= :date';
            remplacements.date = `${created_date}`;
        }

        // Search offer by distance
        if (distance && lat && long) {
            sql += ` AND ${HAVERSINE_PART} < :distance`;
            remplacements.latitude = lat;
            remplacements.longitude = long;
            remplacements.distance = distance;
        }

        // Sort by 
        if (sort_by) {

            if (sort_by == 'date') {

                sql += ' ORDER BY ofrs.created_at DESC';
            }
            if (sort_by == 'distance') {

                sql += ` ORDER BY ${HAVERSINE_PART}`;
            }

        }

        // Limit and offset for pagination
        if (offset !== false && limit) {
            sql += ` OFFSET ${offset} LIMIT ${limit}`;
        }

        sql += ';';

        // Execute the query
        const offers = await sequelize.query(sql, {
            replacements: remplacements,
            type: QueryTypes.SELECT
        });

        return offers;
    },

    /**
     * Repository: Count search offers
     * @param {Object} conditions search, category, state, created_date, distance, lat, long
     * @returns Json
     */
    async repositoryCountSearchOffers(conditions) {

        const { search, category, state, created_date, distance, lat, long } = conditions;

        var countSql = `SELECT 
            COUNT(*)
            FROM offers ofrs
            INNER JOIN addresses adrs
            ON ofrs.exchange_address_id = adrs.id `;

        var remplacements = {};

        const HAVERSINE_PART = " (6371 * acos(cos(radians(:latitude)) * cos(radians(adrs.latitude)) * cos(radians(adrs.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(adrs.latitude)))) ";

        // Status open 
        countSql += 'WHERE status = :status ';

        // Remplacements
        remplacements.status = 'En cours(ouverte)';

        // Search string in label and description
        if (search) {
            countSql += 'AND (label ILIKE :search_name OR description ILIKE :search_name)';
            remplacements.search_name = `%${search}%`;
        }

        // Search by category
        if (category) {
            countSql += ' AND category_id = :category';
            remplacements.category = category;
        }

        // Search by offer state
        if (state) {
            countSql += ' AND state IN (:state)';
            remplacements.state = state;
        }

        // Search offer by date before X days
        if (created_date) {
            countSql += ' AND ofrs.created_at >= :date';
            remplacements.date = `${created_date}`;
        }

        // Search offer by distance
        if (distance && lat && long) {

            countSql += ` AND ${HAVERSINE_PART} < :distance`;
            remplacements.latitude = lat;
            remplacements.longitude = long;
            remplacements.distance = distance;
        }

        countSql += ';';

        // Execute the query
        const offers = await sequelize.query(countSql, {
            replacements: remplacements,
            type: QueryTypes.SELECT
        });

        return offers;
    }
}