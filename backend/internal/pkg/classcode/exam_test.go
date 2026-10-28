package classcode

import "testing"

func TestIsExamTitle(t *testing.T) {
	for _, s := range []string{"UTS Kalkulus", "Ujian Tengah Semester", "UAS - Fisika", "ujian akhir semester [RA]", "Final Exam"} {
		if !IsExamTitle(s) {
			t.Errorf("expected exam: %q", s)
		}
	}
	for _, s := range []string{"Tugas Struktur Data", "Kuis 3", "Status laporan", "Utsawa"} {
		if IsExamTitle(s) {
			t.Errorf("unexpected exam: %q", s)
		}
	}
}
