import multer from 'multer';

const storage = multer.memoryStorage();

// const storage = multer.diskStorage({
// 	destination: function (req, file, cb) {
// 		cb(null, path.join(__dirname, '../', 'public', 'uploads'));
// 	},
// 	filename: function (req, file, cb) {
// 		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
// 		cb(
// 			null,
// 			file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
// 		);
// 	},
// });

const ALLOWED_MIMETYPES = [
	'text/csv',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
	if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Only CSV (.csv) and Excel (.xlsx) files are allowed'));
	}
};

const upload = multer({ storage, fileFilter });

export default upload;
