"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobUrlParserService = exports.ParsedJobDataSchema = void 0;
const zod_1 = require("zod");
const cheerio = __importStar(require("cheerio"));
// Define the structure for parsed job data
exports.ParsedJobDataSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    company: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    salary: zod_1.z.string().optional(),
    deadline: zod_1.z.string().optional(),
    requirements: zod_1.z.array(zod_1.z.string()).optional(),
    jobType: zod_1.z.string().optional(),
    postedDate: zod_1.z.string().optional(),
    success: zod_1.z.boolean(),
    error: zod_1.z.string().optional(),
    source: zod_1.z.string().optional()
});
class JobUrlParserService {
    /**
     * Parse a job URL and extract job information
     */
    static parseJobUrl(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate URL format
                const urlObj = new URL(url);
                // Determine parser based on domain
                const hostname = urlObj.hostname.toLowerCase();
                if (hostname.includes('jobs.nhs.uk') || hostname.includes('trac.jobs')) {
                    return yield this.parseNHSJob(url);
                }
                else if (hostname.includes('indeed.')) {
                    return yield this.parseIndeedJob(url);
                }
                else if (hostname.includes('linkedin.com')) {
                    return yield this.parseLinkedInJob(url);
                }
                else if (hostname.includes('reed.co.uk')) {
                    return yield this.parseReedJob(url);
                }
                else {
                    return yield this.parseGenericJob(url);
                }
            }
            catch (error) {
                console.error('Error parsing job URL:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to parse job URL',
                    source: url
                };
            }
        });
    }
    /**
     * Parse NHS Jobs/Trac job posting
     */
    static parseNHSJob(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const html = yield this.fetchHtml(url);
                const $ = cheerio.load(html);
                // NHS Jobs specific selectors
                const title = $('h1.vacancy-header__title, .vacancy-title, h1').first().text().trim();
                const company = $('.vacancy-header__organisation, .organisation-name, .employer').first().text().trim();
                const location = $('.vacancy-header__location, .location, .vacancy-location').first().text().trim();
                const salary = $('.vacancy-header__salary, .salary, .pay-range').first().text().trim();
                const description = $('.vacancy-description, .job-description, .description').first().text().trim();
                const deadline = $('.vacancy-header__closing, .closing-date, .deadline').first().text().trim();
                // Extract requirements from job description
                const requirements = this.extractRequirements(description);
                return {
                    title: title || undefined,
                    company: company || 'NHS',
                    location: location || undefined,
                    description: description || undefined,
                    salary: salary || undefined,
                    deadline: deadline || undefined,
                    requirements,
                    jobType: 'Healthcare',
                    success: true,
                    source: 'NHS Jobs'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to parse NHS job: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    source: 'NHS Jobs'
                };
            }
        });
    }
    /**
     * Parse Indeed job posting
     */
    static parseIndeedJob(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const html = yield this.fetchHtml(url);
                const $ = cheerio.load(html);
                const title = $('h1[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title').first().text().trim();
                const company = $('[data-testid="inlineHeader-companyName"], .jobsearch-CompanyInfoContainer').first().text().trim();
                const location = $('[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle').first().text().trim();
                const description = $('#jobDescriptionText, .jobsearch-jobDescriptionText').first().text().trim();
                const salary = $('[data-testid="job-salary"], .jobsearch-JobMetadataHeader-item').first().text().trim();
                return {
                    title: title || undefined,
                    company: company || undefined,
                    location: location || undefined,
                    description: description || undefined,
                    salary: salary || undefined,
                    success: true,
                    source: 'Indeed'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to parse Indeed job: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    source: 'Indeed'
                };
            }
        });
    }
    /**
     * Parse LinkedIn job posting
     */
    static parseLinkedInJob(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const html = yield this.fetchHtml(url);
                const $ = cheerio.load(html);
                const title = $('h1.job-title, .jobs-unified-top-card__job-title').first().text().trim();
                const company = $('.jobs-unified-top-card__company-name, .job-company').first().text().trim();
                const location = $('.jobs-unified-top-card__bullet, .job-location').first().text().trim();
                const description = $('.jobs-description-content__text, .job-description').first().text().trim();
                return {
                    title: title || undefined,
                    company: company || undefined,
                    location: location || undefined,
                    description: description || undefined,
                    success: true,
                    source: 'LinkedIn'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to parse LinkedIn job: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    source: 'LinkedIn'
                };
            }
        });
    }
    /**
     * Parse Reed.co.uk job posting
     */
    static parseReedJob(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const html = yield this.fetchHtml(url);
                const $ = cheerio.load(html);
                const title = $('h1.job-title, .job-header h1').first().text().trim();
                const company = $('.job-company, .recruiter-name').first().text().trim();
                const location = $('.job-location, .location').first().text().trim();
                const salary = $('.job-salary, .salary').first().text().trim();
                const description = $('.job-description, .description').first().text().trim();
                return {
                    title: title || undefined,
                    company: company || undefined,
                    location: location || undefined,
                    description: description || undefined,
                    salary: salary || undefined,
                    success: true,
                    source: 'Reed'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to parse Reed job: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    source: 'Reed'
                };
            }
        });
    }
    /**
     * Generic job parser for unknown sites
     */
    static parseGenericJob(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const html = yield this.fetchHtml(url);
                const $ = cheerio.load(html);
                // Generic selectors that might work on various sites
                const title = $('h1, .job-title, .position-title, .vacancy-title').first().text().trim();
                const company = $('.company, .employer, .organization, .company-name').first().text().trim();
                const location = $('.location, .job-location, .address').first().text().trim();
                const description = $('.description, .job-description, .content, .summary').first().text().trim();
                return {
                    title: title || undefined,
                    company: company || undefined,
                    location: location || undefined,
                    description: description || undefined,
                    success: true,
                    source: 'Generic'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to parse generic job: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    source: 'Generic'
                };
            }
        });
    }
    /**
     * Fetch HTML content from URL with proper headers and timeout
     */
    static fetchHtml(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
            try {
                const response = yield fetch(url, {
                    headers: {
                        'User-Agent': this.USER_AGENT,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    },
                    signal: controller.signal
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return yield response.text();
            }
            finally {
                clearTimeout(timeoutId);
            }
        });
    }
    /**
     * Extract requirements/skills from job description
     */
    static extractRequirements(description) {
        if (!description)
            return [];
        const requirements = [];
        const text = description.toLowerCase();
        // Common skills and requirements patterns
        const patterns = [
            // Technical skills
            /\b(javascript|typescript|react|node\.?js|python|java|c\#|php|sql|html|css)\b/g,
            // Healthcare specific
            /\b(nursing|healthcare|medical|clinical|patient care|nmc registration)\b/g,
            // General skills
            /\b(communication|teamwork|leadership|management|analysis|problem.?solving)\b/g,
            // Education
            /\b(degree|diploma|certification|qualification|training)\b/g,
        ];
        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                requirements.push(...matches);
            }
        });
        // Remove duplicates and return unique requirements
        return [...new Set(requirements)].slice(0, 10); // Limit to 10 requirements
    }
    /**
     * Get list of supported job sites
     */
    static getSupportedSites() {
        return [
            'jobs.nhs.uk',
            'trac.jobs',
            'indeed.com',
            'indeed.co.uk',
            'linkedin.com',
            'reed.co.uk'
        ];
    }
    /**
     * Check if a URL is from a supported job site
     */
    static isSupportedSite(url) {
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            return this.getSupportedSites().some(site => hostname.includes(site));
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Canonicalize a job URL to identify the platform and generate a canonical URL
     */
    static canonicalizeJobUrl(url) {
        var _a;
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            // Extract platform identifier and canonicalize URL
            if (hostname.includes('indeed')) {
                const jobId = urlObj.searchParams.get('jk') || urlObj.pathname.split('/').pop();
                return {
                    canonicalUrl: `https://indeed.com/job/${jobId}`,
                    platformId: `indeed_${jobId}`
                };
            }
            else if (hostname.includes('linkedin')) {
                const jobId = (_a = urlObj.pathname.match(/jobs\/view\/(\d+)/)) === null || _a === void 0 ? void 0 : _a[1];
                return {
                    canonicalUrl: `https://linkedin.com/jobs/view/${jobId}`,
                    platformId: `linkedin_${jobId}`
                };
            }
            else if (hostname.includes('reed.co.uk')) {
                const jobId = urlObj.pathname.split('/').pop();
                return {
                    canonicalUrl: `https://reed.co.uk/jobs/${jobId}`,
                    platformId: `reed_${jobId}`
                };
            }
            else if (hostname.includes('jobs.nhs.uk')) {
                const jobId = urlObj.searchParams.get('jobId') || urlObj.pathname.split('/').pop();
                return {
                    canonicalUrl: `https://jobs.nhs.uk/candidate/jobadvert/${jobId}`,
                    platformId: `nhs_${jobId}`
                };
            }
            else if (hostname.includes('trac.jobs')) {
                const jobId = urlObj.pathname.split('/').pop();
                return {
                    canonicalUrl: `https://trac.jobs/job/${jobId}`,
                    platformId: `trac_${jobId}`
                };
            }
            // Fallback for unknown platforms
            return {
                canonicalUrl: url,
                platformId: `unknown_${Buffer.from(url).toString('base64').slice(0, 16)}`
            };
        }
        catch (error) {
            return {
                canonicalUrl: url,
                platformId: `error_${Buffer.from(url).toString('base64').slice(0, 16)}`
            };
        }
    }
    /**
     * Generate a text signature for job content to detect duplicates
     */
    static generateJobSignature(jobData) {
        const normalizeText = (text) => {
            return text
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ') // Remove punctuation
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
        };
        const title = normalizeText(jobData.title || '');
        const company = normalizeText(jobData.company || '');
        const location = normalizeText(jobData.location || '');
        const description = normalizeText(jobData.description || '').slice(0, 500); // Limit description length
        // Create a signature from key job attributes
        const signature = [title, company, location, description]
            .filter(text => text.length > 0)
            .join('|');
        return Buffer.from(signature).toString('base64');
    }
}
exports.JobUrlParserService = JobUrlParserService;
JobUrlParserService.TIMEOUT = 10000; // 10 seconds timeout
JobUrlParserService.USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
