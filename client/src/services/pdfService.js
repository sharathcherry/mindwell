import jsPDF from 'jspdf';

// Color constants for PDF
const COLORS = {
    primary: [124, 58, 237],
    secondary: [34, 211, 238],
    text: [30, 30, 50],
    muted: [100, 116, 139],
    white: [255, 255, 255],
};

const addHeader = (doc, title) => {
    // Header background
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, 210, 50, 'F');

    // Logo/Title
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MindWell', 20, 25);

    // Report title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 20, 38);

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 38);

    // Reset text color
    doc.setTextColor(...COLORS.text);
};

const addSection = (doc, title, content, startY) => {
    let y = startY;

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(title, 20, y);
    y += 10;

    // Section content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    const lines = doc.splitTextToSize(content, 170);
    doc.text(lines, 20, y);
    y += lines.length * 6 + 10;

    return y;
};

const addBulletList = (doc, items, startY) => {
    let y = startY;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    items.forEach(item => {
        doc.text(`• ${item}`, 25, y);
        y += 8;
    });

    return y + 5;
};

export const generateTherapyReportPDF = (reportData) => {
    const doc = new jsPDF();

    addHeader(doc, 'Therapy Recommendation Report');

    let y = 70;

    // Disclaimer
    doc.setFillColor(255, 243, 205);
    doc.rect(15, y - 5, 180, 25, 'F');
    doc.setFontSize(9);
    doc.setTextColor(133, 100, 4);
    const disclaimer = 'Disclaimer: This report is for informational purposes only and does not constitute medical advice. Please consult a licensed mental health professional for diagnosis and treatment.';
    const disclaimerLines = doc.splitTextToSize(disclaimer, 170);
    doc.text(disclaimerLines, 20, y + 5);
    y += 35;

    // Summary
    y = addSection(doc, 'Summary of Your Journey', reportData.summary || 'Based on your conversations with MindWell, we\'ve analyzed your patterns to provide personalized recommendations.', y);

    // Recommended Therapies
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Recommended Therapy Types', 20, y);
    y += 10;

    if (reportData.therapies && reportData.therapies.length > 0) {
        reportData.therapies.forEach((therapy, index) => {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.text);
            doc.text(`${index + 1}. ${therapy.name}`, 20, y);
            y += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLORS.muted);
            const desc = doc.splitTextToSize(therapy.description, 165);
            doc.text(desc, 25, y);
            y += desc.length * 5 + 8;
        });
    }

    // Questions to ask
    if (y > 240) {
        doc.addPage();
        y = 30;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Questions to Ask a Therapist', 20, y);
    y += 10;

    const questions = reportData.questions || [
        'What is your experience with my type of concerns?',
        'What therapy approach do you recommend for me?',
        'How do you measure progress in therapy?',
        'What can I expect from our sessions?',
    ];

    y = addBulletList(doc, questions, y);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('MindWell - Your Mental Wellness Companion', 105, 285, { align: 'center' });

    return doc;
};

export const generateLifestylePlanPDF = (reportData) => {
    const doc = new jsPDF();

    addHeader(doc, 'Lifestyle Wellness Plan');

    let y = 70;

    // Introduction
    y = addSection(doc, 'Your Wellness Journey', reportData.introduction || 'This personalized plan is designed based on your unique needs and patterns.', y);

    // Sleep
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Sleep Hygiene', 20, y);
    y += 10;

    const sleepTips = reportData.sleep || [
        'Maintain a consistent sleep schedule, even on weekends',
        'Create a relaxing bedtime routine 30-60 minutes before sleep',
        'Keep your bedroom cool, dark, and quiet',
        'Avoid screens 1 hour before bedtime',
    ];
    y = addBulletList(doc, sleepTips, y);

    // Exercise
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Physical Activity', 20, y);
    y += 10;

    const exerciseTips = reportData.exercise || [
        'Aim for 30 minutes of moderate exercise 5 days a week',
        'Walking, yoga, and swimming are excellent low-stress options',
        'Morning exercise can help regulate mood throughout the day',
        'Find activities you enjoy to make it sustainable',
    ];
    y = addBulletList(doc, exerciseTips, y);

    if (y > 200) {
        doc.addPage();
        y = 30;
    }

    // Nutrition
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Nutrition for Mental Health', 20, y);
    y += 10;

    const nutritionTips = reportData.nutrition || [
        'Include omega-3 rich foods (fish, walnuts, flaxseed)',
        'Eat plenty of fruits, vegetables, and whole grains',
        'Stay hydrated - aim for 8 glasses of water daily',
        'Limit caffeine and alcohol consumption',
    ];
    y = addBulletList(doc, nutritionTips, y);

    // Daily Routine
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Suggested Daily Routine', 20, y);
    y += 10;

    const routineTips = reportData.routine || [
        'Morning: Start with 5 minutes of mindful breathing',
        'Midday: Take a short walk or stretch break',
        'Evening: Journal or reflect on 3 good things from your day',
        'Night: Practice relaxation before sleep',
    ];
    y = addBulletList(doc, routineTips, y);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('MindWell - Your Mental Wellness Companion', 105, 285, { align: 'center' });

    return doc;
};

export const generateProgressReportPDF = (reportData) => {
    const doc = new jsPDF();

    addHeader(doc, 'Progress Summary Report');

    let y = 70;

    // Overview
    y = addSection(doc, 'Overview', `Period: ${reportData.period || 'Last 30 days'}\nTotal conversations: ${reportData.totalConversations || 0}\nMood entries: ${reportData.moodEntries || 0}\nJournal entries: ${reportData.journalEntries || 0}\nExercises completed: ${reportData.exercisesCompleted || 0}`, y);

    // Mood Trends
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Mood Trends', 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(reportData.moodSummary || 'Your mood has shown positive trends over this period.', 20, y);
    y += 15;

    // Key Insights
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Key Insights', 20, y);
    y += 10;

    const insights = reportData.insights || [
        'You\'ve been consistent with your self-care practices',
        'Your highest moods correlate with exercise days',
        'Journaling appears to help process difficult emotions',
    ];
    y = addBulletList(doc, insights, y);

    // Goals for next period
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Focus Areas', 20, y);
    y += 10;

    const goals = reportData.focusAreas || [
        'Continue building on your exercise routine',
        'Explore mindfulness techniques',
        'Consider discussing progress with a professional',
    ];
    y = addBulletList(doc, goals, y);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('MindWell - Your Mental Wellness Companion', 105, 285, { align: 'center' });

    return doc;
};

export const downloadPDF = (doc, filename) => {
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};
