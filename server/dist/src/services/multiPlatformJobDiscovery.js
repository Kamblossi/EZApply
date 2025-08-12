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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiPlatformJobDiscoveryService = exports.JobSearchSchema = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const zod_1 = require("zod");
const nhsJobSearch_1 = require("./nhsJobSearch");
// =====================================================================
// Multi-Platform Job Discovery Service
// =====================================================================
// Enhanced search schema supporting multiple platforms
exports.JobSearchSchema = zod_1.z.object({
    keywords: zod_1.z.string().min(1, 'Keywords are required'),
    location: zod_1.z.string().optional(),
    radius: zod_1.z.number().min(1).max(100).default(25),
    salaryMin: zod_1.z.number().optional(),
    salaryMax: zod_1.z.number().optional(),
    jobType: zod_1.z.enum(['permanent', 'temporary', 'contract', 'bank', 'apprenticeship']).optional(),
    platforms: zod_1.z.array(zod_1.z.enum(['nhs', 'indeed', 'linkedin', 'reed', 'totaljobs'])).default(['nhs']),
    experience: zod_1.z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
    workPattern: zod_1.z.enum(['full-time', 'part-time', 'flexible', 'remote']).optional(),
    sector: zod_1.z.array(zod_1.z.string()).optional(),
    limit: zod_1.z.number().min(1).max(100).default(20) // Added limit property
});
// =====================================================================
// Indeed Job Search Service
// =====================================================================
class IndeedJobSearchService {
    static searchJobs(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const startTime = Date.now();
            try {
                const searchParams = new URLSearchParams({
                    q: criteria.keywords,
                    l: criteria.location || '',
                    radius: ((_a = criteria.radius) === null || _a === void 0 ? void 0 : _a.toString()) || '25',
                    sort: 'date',
                    limit: '50'
                });
                if (criteria.salaryMin) {
                    searchParams.append('salary', `£${criteria.salaryMin}+`);
                }
                const response = yield axios_1.default.get(`${this.BASE_URL}/jobs?${searchParams}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 15000
                });
                const $ = cheerio.load(response.data);
                const jobs = [];
                $('.job_seen_beacon, [data-jk]').each((index, element) => {
                    try {
                        const $job = $(element);
                        const job = this.extractJobData($job, $);
                        if (job) {
                            jobs.push(job);
                        }
                    }
                    catch (error) {
                        console.warn('Failed to extract Indeed job:', error);
                    }
                });
                return {
                    success: true,
                    platform: 'indeed',
                    totalFound: jobs.length,
                    jobs: jobs.slice(0, 20), // Limit results
                    searchTime: Date.now() - startTime
                };
            }
            catch (error) {
                console.error('Indeed search failed:', error);
                return {
                    success: false,
                    platform: 'indeed',
                    totalFound: 0,
                    jobs: [],
                    errors: [error.message],
                    searchTime: Date.now() - startTime
                };
            }
        });
    }
    static extractJobData($job, $) {
        try {
            const titleElement = $job.find('[data-testid="job-title"] a, .jobTitle a').first();
            const title = titleElement.text().trim();
            const relativeUrl = titleElement.attr('href');
            if (!title || !relativeUrl)
                return null;
            const url = relativeUrl.startsWith('http') ? relativeUrl : `${this.BASE_URL}${relativeUrl}`;
            const company = $job.find('[data-testid="company-name"], .companyName').text().trim();
            const location = $job.find('[data-testid="job-location"], .companyLocation').text().trim();
            const salary = $job.find('.salary-snippet, .estimated-salary').text().trim();
            const description = $job.find('.summary, [data-testid="job-snippet"]').text().trim();
            // Extract job ID from URL
            const jobIdMatch = relativeUrl.match(/jk=([^&]+)/);
            const id = jobIdMatch ? jobIdMatch[1] : `indeed_${Date.now()}_${Math.random()}`;
            return {
                id,
                title,
                company: company || 'Company not specified',
                location: location || 'Location not specified',
                salary: salary || undefined,
                url,
                description,
                platform: 'indeed',
                postedDate: this.extractPostedDate($job),
                requirements: this.extractRequirements(description)
            };
        }
        catch (error) {
            console.warn('Failed to extract Indeed job data:', error);
            return null;
        }
    }
    static extractPostedDate($job) {
        var _a;
        const dateText = $job.find('.date, [data-testid="job-age"]').text().trim();
        if (dateText.includes('day')) {
            const days = parseInt(((_a = dateText.match(/(\d+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '0');
            const date = new Date();
            date.setDate(date.getDate() - days);
            return date.toISOString().split('T')[0];
        }
        return undefined;
    }
    static extractRequirements(description) {
        const requirements = [];
        const commonRequirements = [
            'degree', 'qualification', 'experience', 'skills', 'certification',
            'license', 'training', 'knowledge', 'proficiency'
        ];
        commonRequirements.forEach(req => {
            if (description.toLowerCase().includes(req)) {
                requirements.push(req);
            }
        });
        return requirements;
    }
}
IndeedJobSearchService.BASE_URL = 'https://uk.indeed.com';
// =====================================================================
// Reed Job Search Service
// =====================================================================
class ReedJobSearchService {
    static searchJobs(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const startTime = Date.now();
            try {
                const searchParams = new URLSearchParams({
                    keywords: criteria.keywords,
                    location: criteria.location || '',
                    distance: ((_a = criteria.radius) === null || _a === void 0 ? void 0 : _a.toString()) || '25',
                    sortby: 'date'
                });
                if (criteria.salaryMin) {
                    searchParams.append('salaryfrom', criteria.salaryMin.toString());
                }
                if (criteria.salaryMax) {
                    searchParams.append('salaryto', criteria.salaryMax.toString());
                }
                const response = yield axios_1.default.get(`${this.BASE_URL}/jobs?${searchParams}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 15000
                });
                const $ = cheerio.load(response.data);
                const jobs = [];
                $('.job-result, .job-card').each((index, element) => {
                    try {
                        const $job = $(element);
                        const job = this.extractJobData($job, $);
                        if (job) {
                            jobs.push(job);
                        }
                    }
                    catch (error) {
                        console.warn('Failed to extract Reed job:', error);
                    }
                });
                return {
                    success: true,
                    platform: 'reed',
                    totalFound: jobs.length,
                    jobs: jobs.slice(0, 20),
                    searchTime: Date.now() - startTime
                };
            }
            catch (error) {
                console.error('Reed search failed:', error);
                return {
                    success: false,
                    platform: 'reed',
                    totalFound: 0,
                    jobs: [],
                    errors: [error.message],
                    searchTime: Date.now() - startTime
                };
            }
        });
    }
    static extractJobData($job, $) {
        try {
            const titleElement = $job.find('.job-title a, h3 a').first();
            const title = titleElement.text().trim();
            const relativeUrl = titleElement.attr('href');
            if (!title || !relativeUrl)
                return null;
            const url = relativeUrl.startsWith('http') ? relativeUrl : `${this.BASE_URL}${relativeUrl}`;
            const company = $job.find('.company, .company-name').text().trim();
            const location = $job.find('.location, .job-location').text().trim();
            const salary = $job.find('.salary, .job-salary').text().trim();
            const description = $job.find('.description, .job-description').text().trim();
            const jobIdMatch = relativeUrl.match(/jobs\/(\d+)/);
            const id = jobIdMatch ? jobIdMatch[1] : `reed_${Date.now()}_${Math.random()}`;
            return {
                id,
                title,
                company: company || 'Company not specified',
                location: location || 'Location not specified',
                salary: salary || undefined,
                url,
                description,
                platform: 'reed'
            };
        }
        catch (error) {
            return null;
        }
    }
}
ReedJobSearchService.BASE_URL = 'https://www.reed.co.uk';
// =====================================================================
// Multi-Platform Job Discovery Service
// =====================================================================
class MultiPlatformJobDiscoveryService {
    static searchAllPlatforms(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const startTime = Date.now();
            // Validate search criteria
            const validatedCriteria = exports.JobSearchSchema.parse(criteria);
            const platformPromises = [];
            // Search each requested platform
            if (validatedCriteria.platforms.includes('nhs')) {
                // Map job type from our schema to NHS schema
                const mapJobType = (jobType) => {
                    switch (jobType) {
                        case 'contract': return 'fixed_term';
                        case 'bank': return 'temporary';
                        case 'apprenticeship': return 'fixed_term';
                        default: return jobType || 'any';
                    }
                };
                // Map work pattern from our schema to NHS schema  
                const mapWorkPattern = (workPattern) => {
                    switch (workPattern) {
                        case 'full-time': return 'full_time';
                        case 'part-time': return 'part_time';
                        case 'remote': return 'flexible';
                        default: return workPattern || 'any';
                    }
                };
                platformPromises.push(nhsJobSearch_1.NHSJobSearchService.searchJobs({
                    keywords: validatedCriteria.keywords,
                    location: validatedCriteria.location,
                    radius: validatedCriteria.radius || 25,
                    salaryMin: validatedCriteria.salaryMin,
                    salaryMax: validatedCriteria.salaryMax,
                    jobType: mapJobType(validatedCriteria.jobType),
                    workingPattern: mapWorkPattern(validatedCriteria.workPattern),
                    page: 1,
                    resultsPerPage: validatedCriteria.limit || 20
                }).then(nhsResults => ({
                    success: nhsResults.success,
                    platform: 'nhs',
                    totalFound: nhsResults.totalFound,
                    jobs: nhsResults.jobs.map(job => (Object.assign(Object.assign({}, job), { platform: 'nhs', score: 0.8, description: job.description || '' }))),
                    errors: nhsResults.error ? [nhsResults.error] : [],
                    searchTime: 0
                })).catch(error => ({
                    success: false,
                    platform: 'nhs',
                    totalFound: 0,
                    jobs: [],
                    errors: [error.message],
                    searchTime: 0
                })));
            }
            if (validatedCriteria.platforms.includes('indeed')) {
                platformPromises.push(IndeedJobSearchService.searchJobs(validatedCriteria));
            }
            if (validatedCriteria.platforms.includes('reed')) {
                platformPromises.push(ReedJobSearchService.searchJobs(validatedCriteria));
            }
            // Wait for all searches to complete
            const platformResults = yield Promise.all(platformPromises);
            // Aggregate results
            const platforms = {};
            let totalJobs = 0;
            platformResults.forEach(result => {
                platforms[result.platform] = result;
                if (result.success) {
                    totalJobs += result.totalFound;
                }
            });
            // Get all jobs for recommendations
            const allJobs = platformResults
                .filter(result => result.success)
                .flatMap(result => result.jobs);
            // Generate job recommendations
            const recommendations = this.generateRecommendations(allJobs, validatedCriteria);
            return {
                searchId,
                totalJobs,
                platforms,
                searchCriteria: validatedCriteria,
                searchTime: Date.now() - startTime,
                recommendations
            };
        });
    }
    static generateRecommendations(jobs, criteria) {
        // Score jobs based on criteria match
        const scoredJobs = jobs.map(job => {
            let score = 0;
            // Title relevance
            const titleWords = criteria.keywords.toLowerCase().split(' ');
            const jobTitleLower = job.title.toLowerCase();
            titleWords.forEach(word => {
                if (jobTitleLower.includes(word))
                    score += 10;
            });
            // Location preference
            if (criteria.location && job.location.toLowerCase().includes(criteria.location.toLowerCase())) {
                score += 5;
            }
            // Salary match
            if (job.salary && criteria.salaryMin) {
                const salaryNumbers = job.salary.match(/\d+/g);
                if (salaryNumbers) {
                    const jobSalary = parseInt(salaryNumbers[0]);
                    if (jobSalary >= criteria.salaryMin)
                        score += 8;
                }
            }
            // Recent posting bonus
            if (job.postedDate) {
                const daysAgo = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24));
                if (daysAgo <= 7)
                    score += 3;
            }
            // Platform reliability bonus
            if (job.platform === 'nhs')
                score += 2; // NHS jobs are typically more reliable
            return Object.assign(Object.assign({}, job), { score });
        });
        // Return top 10 recommendations sorted by score
        return scoredJobs
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 10);
    }
    static getSupportedPlatforms() {
        return [
            {
                id: 'nhs',
                name: 'NHS Trac',
                description: 'Official NHS job board with healthcare positions',
                features: ['Healthcare jobs', 'NHS Trust positions', 'Detailed job specs', 'Application tracking'],
                isActive: true
            },
            {
                id: 'indeed',
                name: 'Indeed',
                description: 'Global job search engine with diverse opportunities',
                features: ['Wide job variety', 'Company reviews', 'Salary insights', 'Quick apply'],
                isActive: true
            },
            {
                id: 'reed',
                name: 'Reed',
                description: 'UK recruitment agency with professional roles',
                features: ['Professional roles', 'Recruitment support', 'Career advice', 'Salary guides'],
                isActive: true
            },
            {
                id: 'linkedin',
                name: 'LinkedIn Jobs',
                description: 'Professional network job opportunities',
                features: ['Network connections', 'Company insights', 'Professional growth', 'Industry news'],
                isActive: false // To be implemented
            },
            {
                id: 'totaljobs',
                name: 'Totaljobs',
                description: 'UK job board with career development tools',
                features: ['Career tools', 'CV builder', 'Interview tips', 'Market insights'],
                isActive: false // To be implemented
            }
        ];
    }
    static getJobCategories() {
        return [
            'Healthcare & Medical',
            'Engineering & Technology',
            'Finance & Accounting',
            'Education & Training',
            'Sales & Marketing',
            'Administration & Support',
            'Legal & Compliance',
            'Human Resources',
            'Operations & Logistics',
            'Creative & Design',
            'Research & Development',
            'Customer Service',
            'Management & Leadership',
            'Consulting & Strategy'
        ];
    }
}
exports.MultiPlatformJobDiscoveryService = MultiPlatformJobDiscoveryService;
