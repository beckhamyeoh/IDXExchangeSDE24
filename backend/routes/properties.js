const express = require('express');
const router = express.Router();
const pool = require('../db');

// Filter support for city, zipcode, minPrice, maxPrice, beds, baths
router.get('/', async (req, res) => {
    try{
        
        //validate pagination
        let limit = 20;
        if (req.query.limit !== undefined){
            limit = Number(req.query.limit);
            if (!Number.isInteger(limit) || limit <= 0 || limit > 100){
                return res.status(400).json({ error: 'limit must be an integer between 1 and 100' });
            }
        }
        let offset = 0;
        if (req.query.offset !== undefined){
            offset = Number(req.query.offset);
            if (!Number.isInteger(offset) || offset < 0){
                return res.status(400).json({ error: 'offset must be an integer of 0 or greater' });
            }
        }

        //validate numeric filters
        for (const field of ['minPrice', 'maxPrice', 'beds', 'baths']){ m
            if (req.query[field] !== undefined){
                const n = Number(req.query[field]);
                if (Number.isNaN(n) || n < 0){
                    return res.status(400).json({ error: `${field} must be a non-negative number` });
                }
            }
        }
        // build the WHERE clause dynamically
        const conditions = [];
        const values = [];

        if (req.query.city){
            conditions.push('LOWER(TRIM(L_City)) = LOWER(TRIM(?))');
            values.push(req.query.city);
        }
        if (req.query.zipcode){
            conditions.push('L_Zip = ?');
            values.push(req.query.zipcode);
        }
        if (req.query.minPrice){
            conditions.push('L_SystemPrice >= ?');
            values.push(req.query.minPrice);
        }
        if (req.query.maxPrice){
            conditions.push('L_SystemPrice <= ?');
            values.push(req.query.maxPrice);
        }
        if (req.query.beds){
            conditions.push('L_Keyword2 >= ?');
            values.push(req.query.beds);
        }
        if (req.query.baths){
            conditions.push('LM_Dec_3 >= ?');
            values.push(req.query.baths);
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join( ' AND ') : '';


        // page of results
        const [rows] = await pool.query(
            `SELECT * FROM rets_property ${whereClause} LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );

        //total count of properties for pagination
        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`,
            [...values]
        );
        const total = countRows[0].total;

        res.json({ total, limit, offset, results: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
});

module.exports = router;