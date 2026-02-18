import axios from "axios";

let whatsappmsgAuth;

async function getauthtoken() {
    try {
        const abcd = await axios.post(
            "https://messagingapi.charteredinfo.com/AuthTokenV1/AuthToken",
            {
                userId: "purchase@lordkrishnainternational.com",
                password: "Lkigems@2026$",
            }
        );
        whatsappmsgAuth = abcd.data.txnOutcome;
        console.log(whatsappmsgAuth);

        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}

export async function SendWhatsAppMessgae(
    number1,
    template,
    parameter,
    tokenex,
    ImageId = null
) {

    const number = number1?.slice(-10);
    if (!/^\d+$/.test(number) || number.length != 10 || !number) {
        return false;
    }

    parameter.forEach((item) => {
        if (typeof item.text !== "string") {
            item.text = String(item.text);
        }
        if (item.text.trim() === "") {
            item.text = item.text ? String(item.text) : "N/A";
        }
    });

    let messagejson1 = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: `91${number}`,
        type: "template",
        template: {
            name: template?.toLowerCase(),
            language: {
                code: "en",
            },
            components: [
                {
                    type: "header",
                    parameters: [
                        {
                            type: "image",
                            image: {
                                id: ImageId,
                            },
                        },
                    ],
                },
                {
                    type: "body",
                    parameters: parameter,
                },
            ],
        },
    };
    let messagejson = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: `91${number}`,
        type: "template",
        template: {
            name: template?.toLowerCase(),
            language: {
                code: "en",
            },
            components: [
                {
                    type: "body",
                    parameters: parameter,
                },
            ],
        },
    };
    try {
        if (!whatsappmsgAuth) {
            await getauthtoken();
        }
        await axios.post(
            "https://messagingapi.charteredinfo.com/v19.0/904631676077069/messages",
            ImageId ? messagejson1 : messagejson,
            {
                headers: {
                    Authorization: `Bearer ${whatsappmsgAuth}`,
                },
            }
        );
        return true;
    } catch (e) {
        if (tokenex == 1) {
            return false;
        } else {
            const data = await getauthtoken();
            if (data)
                await SendWhatsAppMessgae(number, template, parameter, 1);
        }
    }
}
