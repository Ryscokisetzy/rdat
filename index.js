const fs = require('fs');
const crypto = require('crypto');
const csv = require('csv-parser');
const csvWriter = require('csv-writer');
const archiver = require('archiver');
const readlineSync = require('readline-sync');
const path = require('path');

function modifyStatisticsFile(username) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream('./data/statistics.csv')
            .pipe(csv())
            .on('data', (data) => {
                if (data.statistic === 'account name') {
                    data.value = username;
                }
                results.push(data);
            })
            .on('end', () => {
                const createCsvWriter = csvWriter.createObjectCsvWriter;
                const writer = createCsvWriter({
                    path: './data/statistics.csv',
                    header: [
                        { id: 'statistic', title: 'statistic' },
                        { id: 'value', title: 'value' },
                    ],
                });
                writer
                    .writeRecords(results)
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => reject(err));
            });
    });
}

function getFileChecksum(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}

async function updateCheckFile(newChecksum) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream('./data/checkfile.csv')
            .pipe(csv())
            .on('data', (data) => {
                if (data.filename === 'statistics.csv') {
                    data.sha256 = newChecksum;
                }
                results.push(data);
            })
            .on('end', () => {
                const createCsvWriter = csvWriter.createObjectCsvWriter;
                const writer = createCsvWriter({
                    path: './data/checkfile.csv',
                    header: [
                        { id: 'filename', title: 'filename' },
                        { id: 'sha256', title: 'sha256' },
                    ],
                });
                writer
                    .writeRecords(results)
                    .then(() => resolve())
                    .catch((err) => reject(err));
            });
    });
}

function zipCsvFiles(username) {
    return new Promise((resolve, reject) => {
        const fileName = username;
        const output = fs.createWriteStream(`${fileName}_csv_files.zip`);
        const archive = archiver('zip', {
            zlib: { level: 9 },
        });

        output.on('close', () => resolve());
        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        fs.readdirSync('./data/').forEach((file) => {
            if (file.endsWith('.csv')) {
                archive.file(path.join('./data/', file), { name: file });
            }
        });
        archive.finalize();
    });
};


(async function () {
    try {
        const username = readlineSync.question('Masukan username : ');
        if (!username) {
            console.log('Username tidak boleh kosong!')
            process.exit(0)
        }


        await modifyStatisticsFile(username);
        const checksum = await getFileChecksum('./data/statistics.csv');
        console.log(`new statistic sha : ${checksum}`)
        await updateCheckFile(checksum);
        await zipCsvFiles(username);
        console.log('All tasks completed successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();
