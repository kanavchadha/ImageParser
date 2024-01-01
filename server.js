const express = require('express');
const multer = require('multer');
const path = require('path');
const { createWorker } = require('tesseract.js');
const app = express();

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

const fileFilter = (req, file, cb) => {
    //allowed extensions
    const filetypes = /img|jpg|jpeg|png|webp|gif/;

    //check extensions
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    //check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb("ERR: Images Only!!");
    }
}

const upload = multer({ storage: storage, limits: { fileSize: 2000000 }, fileFilter })

app.use(express.static(__dirname + '/public'));

app.get('/', async (req, res) => {
    return res.sendFile(__dirname + '/index.html');
})

app.post('/parse-expenso-file', upload.array('file', 20), async (req, res) => {
    let result = [];
    try {
        for (file of req.files) {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(file.path);
            await worker.terminate();
            const data = { text: ret.data.text, lines: ret.data.lines?.map(line => line.text) };
            if(process.env.printData) console.log(data.lines);
            if (!data.lines) data.lines = [];
            for (let i = data.lines.length - 1; i >= 0; i--) {
                try {
                    if (!data.lines[i]) continue;
                    const line = data.lines[i].replace('\\n', '');
                    if (line.search(/^Received|Paid|Sent|Added/gi) === 0) {
                        let title = '', amount = 0, pline = data.lines[i - 1], j = i - 1;
                        while (j >= 0 && pline.search(/^Received|Paid|Sent|Added/gi) !== 0) {
                            if ((i - j) > 3) break;
                            let titleOrAmt = pline.split(/\s\-\S/g);
                            if (titleOrAmt.length > 1) {
                                title = titleOrAmt[0]
                                amount = Number(titleOrAmt[1].replaceAll(/\D/gi, ''));
                                if (!isNaN(amount)) break;
                            }
                            titleOrAmt = pline.split(/\s\+\S/g);
                            if (titleOrAmt.length > 1) {
                                title = titleOrAmt[0]
                                amount = Number(titleOrAmt[1].replaceAll(/\D/gi, ''));
                                if (!isNaN(amount)) break;
                            }
                            j--;
                            pline = data.lines[j];
                        }
                        const date = parseDate(line);
                        result.push({ title, amount, date, category: getRandomCategory(), description: title, status: 'true' })
                        i = j + 1;
                    }
                } catch (error) {
                    console.log(`Error Occured while parsing: ind-${i}, line - ${data.lines[i]}`, 'Error: ', error.message);
                }
            }
        }
        return res.send(result);
    } catch (err) {
        console.error("Error Occured while parsing data!", err);
        return res.status(500).send({ result, error: `Something Went Wrong! ${err.message}` });
    }
})

const parseDate = (line) => {
    let timeStamp = new Date();
    const dateParts = line.split(', ');
    if (dateParts.length > 1) {
        let date = dateParts[0].split(' '), time = dateParts[1].slice(0, 8);
        if (date.length === 2 && isNaN(date.at(-1)) && isNaN(date.at(-2))) {
            if (date.at(-1) === 'Yesterday'){
                date = (new Date(timeStamp.getFullYear(), timeStamp.getMonth(), timeStamp.getDate()-1)).toDateString();
            } else {
                date = timeStamp.toDateString()
            }
        } else if (isNaN(date.at(-1)) && !isNaN(date.at(-2))) {
            date = `${date.at(-2)} ${date.at(-1)} ${timeStamp.getFullYear()}`
        } else {
            date = `${date.at(-3)} ${date.at(-2)} ${date.at(-1)}`
        }
        timeStamp = new Date(date + ' ' + time);
    }
    return timeStamp.toISOString();
}

const getRandomCategory = () => {
    const EXPENSE_CATEGORIES = ['Education', 'Food/Eatables', 'Bills', 'Rent', 'Home Needs', 'Vehicles', 'Child', 'Medical', 'Beauty and Care', 'Clothing', 'Enjoyment', 'Personal Need', 'Investment', 'Gifts', 'Other', 'Monthly Income'];
    const randomInd = Math.floor(Math.random() * EXPENSE_CATEGORIES.length);
    return EXPENSE_CATEGORIES[randomInd];
}

app.use('*', (req, res) => {
    return res.redirect('/');
})

app.use((err, req, res, next) => {
    console.log('Error Occured: ', err);
    return res.status(500).send({ error: err.message, code: err.code || 400 });
})

const PORT = process.env.PORT || 8060;
app.listen(PORT, () => {
    console.log(`server is running.`);
})