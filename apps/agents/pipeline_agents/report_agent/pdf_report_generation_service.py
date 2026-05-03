import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    PageBreak,
    KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from data_models.validation_agent_data_models import ValidationAgentOutput, ValidatedProblem

# Brand colors
COLOR_BRAND_VIOLET = colors.HexColor("#6D28D9")
COLOR_BRAND_INDIGO = colors.HexColor("#4338CA")
COLOR_SCORE_GREEN = colors.HexColor("#059669")
COLOR_SCORE_ORANGE = colors.HexColor("#D97706")
COLOR_SCORE_RED = colors.HexColor("#DC2626")
COLOR_DARK_SURFACE = colors.HexColor("#1E1B4B")
COLOR_LIGHT_SURFACE = colors.HexColor("#F5F3FF")
COLOR_TEXT_MUTED = colors.HexColor("#6B7280")
COLOR_BORDER = colors.HexColor("#E5E7EB")

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 20 * mm


def _get_opportunity_score_color(score: int) -> colors.HexColor:
    if score >= 8:
        return COLOR_SCORE_GREEN
    if score >= 5:
        return COLOR_SCORE_ORANGE
    return COLOR_SCORE_RED


def _build_pdf_document_styles() -> dict[str, ParagraphStyle]:
    base_styles = getSampleStyleSheet()

    return {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base_styles["Normal"],
            fontSize=32,
            textColor=colors.white,
            spaceAfter=8,
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle",
            parent=base_styles["Normal"],
            fontSize=14,
            textColor=colors.HexColor("#C4B5FD"),
            spaceAfter=4,
            fontName="Helvetica",
            alignment=TA_CENTER,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta",
            parent=base_styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#A78BFA"),
            fontName="Helvetica",
            alignment=TA_CENTER,
        ),
        "section_heading": ParagraphStyle(
            "section_heading",
            parent=base_styles["Normal"],
            fontSize=18,
            textColor=COLOR_BRAND_VIOLET,
            fontName="Helvetica-Bold",
            spaceBefore=12,
            spaceAfter=6,
        ),
        "problem_title": ParagraphStyle(
            "problem_title",
            parent=base_styles["Normal"],
            fontSize=14,
            textColor=COLOR_DARK_SURFACE,
            fontName="Helvetica-Bold",
            spaceBefore=4,
            spaceAfter=4,
        ),
        "body_text": ParagraphStyle(
            "body_text",
            parent=base_styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#374151"),
            fontName="Helvetica",
            leading=15,
            spaceAfter=4,
        ),
        "quote": ParagraphStyle(
            "quote",
            parent=base_styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#4B5563"),
            fontName="Helvetica-Oblique",
            leading=13,
            leftIndent=12,
            spaceAfter=3,
        ),
        "label": ParagraphStyle(
            "label",
            parent=base_styles["Normal"],
            fontSize=8,
            textColor=COLOR_TEXT_MUTED,
            fontName="Helvetica-Bold",
            spaceAfter=2,
            spaceBefore=8,
        ),
        "mvp_text": ParagraphStyle(
            "mvp_text",
            parent=base_styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#1E40AF"),
            fontName="Helvetica",
            leading=15,
            spaceAfter=4,
            backColor=colors.HexColor("#EFF6FF"),
            leftIndent=8,
            rightIndent=8,
        ),
    }


def _build_cover_page_elements(
    research_topic: str,
    total_posts_analyzed: int,
    total_problems_found: int,
    generated_at: datetime,
    styles: dict[str, ParagraphStyle],
) -> list:
    """Builds the dark branded cover page elements."""
    elements = []

    # Dark cover background via a full-width colored table
    cover_table_data = [[""]]
    cover_table = Table(cover_table_data, colWidths=[PAGE_WIDTH - 2 * MARGIN], rowHeights=[60 * mm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_DARK_SURFACE),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
        ("TOPPADDING", (0, 0), (-1, -1), 20),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
    ]))
    elements.append(cover_table)
    elements.append(Spacer(1, 8 * mm))

    # FluxIdeas label
    elements.append(Paragraph("⚡ FluxIdeas", styles["cover_subtitle"]))
    elements.append(Spacer(1, 3 * mm))

    # Report title
    elements.append(Paragraph("Market Research Report", styles["section_heading"]))
    elements.append(Spacer(1, 2 * mm))

    # Topic
    topic_style = ParagraphStyle(
        "topic_display",
        parent=styles["cover_title"],
        fontSize=22,
        textColor=COLOR_BRAND_VIOLET,
        fontName="Helvetica-Bold",
        alignment=TA_LEFT,
    )
    elements.append(Paragraph(f'"{research_topic}"', topic_style))
    elements.append(Spacer(1, 6 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER))
    elements.append(Spacer(1, 4 * mm))

    # Stats row
    stats_data = [
        [
            _stat_cell(str(total_posts_analyzed), "Posts Analyzed"),
            _stat_cell(str(total_problems_found), "Problems Found"),
            _stat_cell(generated_at.strftime("%b %d, %Y"), "Generated"),
        ]
    ]
    stats_table = Table(stats_data, colWidths=[(PAGE_WIDTH - 2 * MARGIN) / 3] * 3)
    stats_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_LIGHT_SURFACE),
        ("ROUNDEDCORNERS", [4]),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER))

    return elements


def _stat_cell(value: str, label: str) -> Paragraph:
    style = getSampleStyleSheet()["Normal"]
    return Paragraph(
        f'<font size="18" color="#6D28D9"><b>{value}</b></font><br/>'
        f'<font size="8" color="#6B7280">{label}</font>',
        ParagraphStyle("stat", parent=style, alignment=TA_CENTER),
    )


def _build_validated_problem_section_elements(
    problem_rank: int,
    validated_problem: ValidatedProblem,
    styles: dict[str, ParagraphStyle],
) -> list:
    """Builds one full section block for a single validated problem."""
    elements: list = []
    cluster = validated_problem.source_problem_cluster
    score = validated_problem.opportunity_gap_score
    score_color = _get_opportunity_score_color(score)

    # Problem header row: rank + title + score badge
    header_data = [[
        Paragraph(
            f'<font size="11" color="#6D28D9"><b>#{problem_rank}</b></font>  '
            f'<font size="13" color="#1E1B4B"><b>{cluster.problem_title}</b></font>',
            ParagraphStyle("ph", parent=styles["body_text"], leading=18),
        ),
        Paragraph(
            f'<font size="16" color="{score_color.hexval()}"><b>{score}/10</b></font><br/>'
            f'<font size="7" color="#6B7280">Opportunity Score</font>',
            ParagraphStyle("score", parent=styles["body_text"], alignment=TA_CENTER),
        ),
    ]]
    header_table = Table(
        header_data,
        colWidths=[PAGE_WIDTH - 2 * MARGIN - 28 * mm, 28 * mm],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_LIGHT_SURFACE),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("RIGHTPADDING", (0, 0), (0, 0), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 2, COLOR_BRAND_VIOLET),
    ]))
    elements.append(KeepTogether([header_table]))
    elements.append(Spacer(1, 3 * mm))

    # Description
    elements.append(Paragraph("THE PROBLEM", styles["label"]))
    elements.append(Paragraph(cluster.problem_description, styles["body_text"]))

    # Who is affected
    elements.append(Paragraph("AFFECTED USERS", styles["label"]))
    elements.append(Paragraph(cluster.affected_user_persona, styles["body_text"]))

    # Evidence quotes
    if cluster.supporting_evidence_quotes:
        elements.append(Paragraph("WHAT USERS SAY", styles["label"]))
        for quote_text in cluster.supporting_evidence_quotes[:3]:
            cleaned_quote = quote_text.replace("<", "&lt;").replace(">", "&gt;")
            elements.append(Paragraph(f'"{cleaned_quote}"', styles["quote"]))

    # Market size + monetization
    market_row_data = [[
        Paragraph(
            f'<font size="8" color="#6B7280"><b>MARKET SIZE</b></font><br/>'
            f'<font size="10" color="#374151">{validated_problem.market_size_estimate}</font>',
            ParagraphStyle("ms", parent=styles["body_text"]),
        ),
        Paragraph(
            f'<font size="8" color="#6B7280"><b>TARGET CUSTOMER</b></font><br/>'
            f'<font size="10" color="#374151">{validated_problem.target_customer_segment}</font>',
            ParagraphStyle("tc", parent=styles["body_text"]),
        ),
        Paragraph(
            f'<font size="8" color="#6B7280"><b>MONETIZATION</b></font><br/>'
            f'<font size="10" color="#374151">{validated_problem.monetization_potential}</font>',
            ParagraphStyle("mon", parent=styles["body_text"]),
        ),
    ]]
    market_table = Table(
        market_row_data,
        colWidths=[(PAGE_WIDTH - 2 * MARGIN) / 3] * 3,
    )
    market_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("LINEABOVE", (0, 0), (-1, 0), 0.5, COLOR_BORDER),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, COLOR_BORDER),
    ]))
    elements.append(Spacer(1, 2 * mm))
    elements.append(market_table)

    # Existing solutions (competitors)
    if validated_problem.existing_solutions:
        elements.append(Paragraph("EXISTING SOLUTIONS & GAPS", styles["label"]))
        competitor_rows = [
            [
                Paragraph(
                    f'<b>{sol.competitor_name}</b>',
                    ParagraphStyle("cn", parent=styles["body_text"], fontSize=9),
                ),
                Paragraph(sol.competitor_description, styles["body_text"]),
                Paragraph(
                    f'⚠ {sol.key_weakness_or_gap}',
                    ParagraphStyle("gap", parent=styles["body_text"], fontSize=9, textColor=COLOR_SCORE_ORANGE),
                ),
            ]
            for sol in validated_problem.existing_solutions
        ]
        competitor_header = [
            [
                Paragraph('<font size="8" color="white"><b>Product</b></font>', ParagraphStyle("ch", parent=styles["body_text"])),
                Paragraph('<font size="8" color="white"><b>What it does</b></font>', ParagraphStyle("ch2", parent=styles["body_text"])),
                Paragraph('<font size="8" color="white"><b>Gap / Weakness</b></font>', ParagraphStyle("ch3", parent=styles["body_text"])),
            ]
        ]
        col_widths = [35 * mm, (PAGE_WIDTH - 2 * MARGIN - 35 * mm - 65 * mm), 65 * mm]
        comp_table = Table(competitor_header + competitor_rows, colWidths=col_widths)
        comp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_BRAND_INDIGO),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_LIGHT_SURFACE]),
            ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(comp_table)

    # MVP suggestion
    elements.append(Paragraph("SUGGESTED MVP", styles["label"]))
    elements.append(Paragraph(f"💡 {validated_problem.suggested_mvp_approach}", styles["mvp_text"]))

    # Validation reasoning
    elements.append(Paragraph("ANALYST NOTES", styles["label"]))
    elements.append(Paragraph(validated_problem.validation_reasoning, styles["body_text"]))

    elements.append(Spacer(1, 5 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER))
    elements.append(Spacer(1, 5 * mm))

    return elements


def _build_methodology_section(
    research_topic: str,
    validation_output: ValidationAgentOutput,
    styles: dict[str, ParagraphStyle],
) -> list:
    elements: list = []
    elements.append(Paragraph("Data Methodology", styles["section_heading"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_BRAND_VIOLET))
    elements.append(Spacer(1, 3 * mm))
    elements.append(Paragraph(
        f"This report was generated by FluxIdeas's 4-agent AI pipeline analyzing online discussions "
        f"about \"{research_topic}\". The pipeline collected posts from Reddit, Product Hunt, "
        f"Google Trends, and the broader web, then used Claude AI to cluster them into problem "
        f"patterns and evaluate each for market opportunity.",
        styles["body_text"],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(
        f"Validation completed: {validation_output.validation_finished_at_utc.strftime('%Y-%m-%d %H:%M UTC')}  |  "
        f"Problems evaluated: {validation_output.total_problems_validated_count}  |  "
        f"Model: claude-sonnet-4-6",
        ParagraphStyle("meta_footer", parent=styles["body_text"], fontSize=8, textColor=COLOR_TEXT_MUTED),
    ))
    return elements


def generate_market_research_pdf_report_as_bytes(
    validation_agent_output: ValidationAgentOutput,
    top_n_problems_to_include_in_report: int = 5,
) -> bytes:
    """
    Generates a professional PDF market research report from the validation output.
    Returns the PDF as raw bytes ready to be uploaded to Cloudinary.
    """
    pdf_buffer = io.BytesIO()
    styles = _build_pdf_document_styles()

    pdf_document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=f"FluxIdeas — {validation_agent_output.research_topic}",
        author="FluxIdeas AI Pipeline",
    )

    top_problems = validation_agent_output.validated_problems[:top_n_problems_to_include_in_report]
    total_posts_analyzed = sum(
        problem.source_problem_cluster.estimated_frequency_in_collected_posts
        for problem in top_problems
    )

    all_document_elements: list = []

    # Cover page
    all_document_elements.extend(
        _build_cover_page_elements(
            research_topic=validation_agent_output.research_topic,
            total_posts_analyzed=validation_agent_output.total_problems_validated_count * 20,
            total_problems_found=len(top_problems),
            generated_at=validation_agent_output.validation_finished_at_utc,
            styles=styles,
        )
    )

    all_document_elements.append(Spacer(1, 8 * mm))
    all_document_elements.append(Paragraph("Top Validated Problems", styles["section_heading"]))
    all_document_elements.append(HRFlowable(width="100%", thickness=2, color=COLOR_BRAND_VIOLET))
    all_document_elements.append(Spacer(1, 4 * mm))

    # One section per validated problem
    for problem_rank, validated_problem in enumerate(top_problems, start=1):
        all_document_elements.extend(
            _build_validated_problem_section_elements(
                problem_rank=problem_rank,
                validated_problem=validated_problem,
                styles=styles,
            )
        )

    all_document_elements.append(PageBreak())
    all_document_elements.extend(
        _build_methodology_section(
            research_topic=validation_agent_output.research_topic,
            validation_output=validation_agent_output,
            styles=styles,
        )
    )

    pdf_document.build(all_document_elements)
    pdf_bytes = pdf_buffer.getvalue()
    pdf_buffer.close()

    return pdf_bytes
