/* ======================================
   SBR SMART TOOLS
   NODE.JS BACKEND SERVER
====================================== */

"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const YtDlpWrap = require("yt-dlp-wrap").default;


/* =========================
   APP
========================= */

const app = express();

const PORT = process.env.PORT || 3000;


/* =========================
   MIDDLEWARE
========================= */

app.use(
    cors({
        origin: true,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"]
    })
);

app.use(express.json({ limit: "1mb" }));


/* =========================
   YT-DLP
========================= */

const ytDlpPath =
    path.join(__dirname, "yt-dlp.exe");


if (!fs.existsSync(ytDlpPath)) {

    console.error(
        "ERROR: yt-dlp.exe nahi mila:"
    );

    console.error(ytDlpPath);

    process.exit(1);
}


const ytDlpWrap =
    new YtDlpWrap(ytDlpPath);


/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "SBR Smart Tools server is running!",
        status: "online"
    });

});


/* =========================
   API HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        server: "online",
        ytDlp: fs.existsSync(ytDlpPath)
    });

});


/* =========================
   DOWNLOAD API
========================= */

app.post(
    "/api/download",
    async (req, res) => {

        const {
            url,
            platform,
            type
        } = req.body;


        /* =========================
           VALIDATE URL
        ========================= */

        if (!url) {

            return res.status(400).json({

                success: false,

                error:
                    "URL required hai."

            });

        }


        let parsedUrl;

        try {

            parsedUrl =
                new URL(url);

        } catch {

            return res.status(400).json({

                success: false,

                error:
                    "Invalid URL."

            });

        }


        if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Sirf HTTP/HTTPS URL allowed hai."

            });

        }


        console.log(
            "================================"
        );

        console.log(
            "Download request"
        );

        console.log(
            "Platform:",
            platform || "unknown"
        );

        console.log(
            "Type:",
            type || "unknown"
        );

        console.log(
            "URL:",
            url
        );

        console.log(
            "================================"
        );


        try {

            /* =========================
               GET METADATA
            ========================= */

            const output =
                await ytDlpWrap.execPromise([
                    url,

                    "--dump-single-json",

                    "--no-warnings",

                    "--no-playlist",

                    "--skip-download"
                ]);


            const metadata =
                JSON.parse(output);


            /* =========================
               FIND MEDIA URL
            ========================= */

            let downloadUrl =
                metadata.url || null;


            if (
                !downloadUrl &&
                Array.isArray(
                    metadata.formats
                )
            ) {

                const formats =
                    metadata.formats
                        .filter(
                            format =>
                                format.url
                        )
                        .slice()
                        .reverse();


                const bestFormat =
                    formats.find(
                        format => {

                            return (
                                format.vcodec !==
                                    "none" ||
                                format.acodec !==
                                    "none"
                            );

                        }
                    );


                if (bestFormat) {

                    downloadUrl =
                        bestFormat.url;

                }

            }


            /* =========================
               NO MEDIA URL
            ========================= */

            if (!downloadUrl) {

                return res.status(422).json({

                    success: false,

                    error:
                        "Is URL se direct media URL nahi mila."

                });

            }


            /* =========================
               RESPONSE
            ========================= */

            return res.json({

                success: true,

                platform:
                    platform || null,

                type:
                    type || null,

                title:
                    metadata.title ||
                    "SBR Smart Tools Download",

                thumbnail:
                    metadata.thumbnail ||
                    "",

                duration:
                    metadata.duration ||
                    null,

                downloadUrl:
                    downloadUrl

            });


        } catch (error) {

            console.error(
                "yt-dlp error:"
            );

            console.error(
                error?.message ||
                error
            );


            return res.status(500).json({

                success: false,

                error:
                    "Video process nahi ho paya. URL public aur supported hona chahiye."

            });

        }

    }
);


/* =========================
   404
========================= */

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            error:
                "Route not found."

        });

    }
);


/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "Server error:",
            error
        );

        if (res.headersSent) {

            return next(error);

        }

        res.status(500).json({

            success: false,

            error:
                "Internal server error."

        });

    }
);


/* =========================
   START SERVER
========================= */

app.listen(
    PORT,
    () => {

        console.log(
            "================================"
        );

        console.log(
            "SBR Smart Tools Backend"
        );

        console.log(
            `Server: http://localhost:${PORT}`
        );

        console.log(
            `Health: http://localhost:${PORT}/api/health`
        );

        console.log(
            "yt-dlp: READY"
        );

        console.log(
            "================================"
        );

    }
);