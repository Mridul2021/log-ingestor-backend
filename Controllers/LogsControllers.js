const User = require('../models/Schema');
const csv=require("fast-csv");
const fs=require("fs")
const BASE_URL=process.env.BASE_URL;
//register logs
exports.userpost = async (req, res) => {
    try {
        // Assuming req.body contains the user data you want to save
        const { level, message, resourceId, timestamp, traceId, spanId, commit, parentResourceId,metadata } = req.body;

        const userData = new User({
            level,
            message,
            resourceId,
            timestamp,
            traceId,
            spanId,
            commit,
            metadata:{
                parentResourceId:metadata.parentResourceId
            }
        });

        await userData.save();
        res.status(200).json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

//userget
exports.userget = async (req, res) => {
    const search = req.query.search || "";
    const searchmessage = req.query.message || "";
    const searchresourceId = req.query.resourceId || "";
    const searchtimestamp = req.query.timestamp || "";
    const searchtimecommit = req.query.commit || "";
    const searchtimetraceId = req.query.traceId || "";
    const searchtimespanId = req.query.spanId || "";
    const searchtimemetadata_parentResourceId = req.query.metadata_parentResourceId || "";
    const sort = req.query.sort || "";

    const page = req.query.page || 1
    const ITEM_PER_PAGE = 5;

    const query = {
        level: { $regex: search, $options: "i" },
        message: { $regex: searchmessage, $options: "i" },
        resourceId: { $regex: searchresourceId, $options: "i" },
        timestamp: { $regex: searchtimestamp, $options: "i" },
        traceId: { $regex: searchtimetraceId, $options: "i" },
        commit: { $regex: searchtimecommit, $options: "i" },
        spanId: { $regex: searchtimespanId, $options: "i" },
    };

    if (searchtimemetadata_parentResourceId) {
        query['metadata.parentResourceId'] = { $regex: searchtimemetadata_parentResourceId, $options: "i" };
    }

    try {
        const skip = (page - 1) * ITEM_PER_PAGE 
        const userdata = await User.find(query).lean().sort({ timestamp: sort == "new" ? -1 : 1 }).limit(ITEM_PER_PAGE).skip(skip);;
        const count = await User.countDocuments(query);
        // console.log(count);
        const pageCount = Math.ceil(count/ITEM_PER_PAGE);

        res.status(200).json({
            Pagination:{
                count,pageCount
            },
            userdata
        })
    } catch (error) {
        res.status(401).json(error);
    }
};


//user export
exports.userExport = async (req, res) => {
    try {
        const usersdata = await User.find();

        const csvStream = csv.format({ headers: true });

        if (!fs.existsSync("public/files/export/")) {
            if (!fs.existsSync("public/files")) {
                fs.mkdirSync("public/files/");
            }
            if (!fs.existsSync("public/files/export")) {
                fs.mkdirSync("./public/files/export/");
            }
        }

        const writablestream = fs.createWriteStream(
            "public/files/export/logs.csv"
        );

        csvStream.pipe(writablestream);

        writablestream.on("finish", function () {
            res.json({
                downloadUrl: `${BASE_URL}/files/export/logs.csv`,
            });
        });
        if (usersdata.length > 0) {
            usersdata.map((User) => {
                csvStream.write({
                    level: User.level ? User.level : "-",
                    message: User.message ? User.message : "-",
                    resourceId: User.resourceId ? User.resourceId : "-",
                    timestamp: User.timestamp ? User.timestamp : "-",
                    traceId: User.traceId ? User.traceId : "-",
                    spanId: User.spanId ? User.spanId : "-",
                    commit: User.commit ? User.commit : "-",
                })
            })
        }
        csvStream.end();
        writablestream.end();

    } catch (error) {
        res.status(401).json(error)
    }
}
