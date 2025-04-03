exports.lambdaHandler = async (event, context) => {
    console.log("Hello World CRON");
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Hello World CRON",
        }),
    };
};