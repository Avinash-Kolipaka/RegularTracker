import difflib

def generate_text_diff(old_text, new_text):
    """
    Computes a clean structured difference between two versions of regulatory text.
    Returns:
        {
            'has_changes': bool,
            'added_lines': list,
            'removed_lines': list,
            'diff_html_preview': str,
            'change_summary': str
        }
    """
    if old_text == new_text:
        return {
            'has_changes': False,
            'added_lines': [],
            'removed_lines': [],
            'diff_html_preview': '',
            'change_summary': 'No textual changes detected.'
        }

    old_lines = (old_text or '').splitlines()
    new_lines = (new_text or '').splitlines()

    differ = difflib.Differ()
    diff = list(differ.compare(old_lines, new_lines))

    added = []
    removed = []
    for line in diff:
        if line.startswith('+ '):
            added.append(line[2:])
        elif line.startswith('- '):
            removed.append(line[2:])

    summary = f"{len(added)} line(s) added, {len(removed)} line(s) modified or removed."

    return {
        'has_changes': True,
        'added_lines': added,
        'removed_lines': removed,
        'change_summary': summary,
    }
