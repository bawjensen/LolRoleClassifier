# This makefile is on purpose not made with configure, to show how to use the library
# The make file requires that the fann library is installed, and is linked to with the -lfann flag

GCC=g++

TARGETS = trainer tester

all: $(TARGETS)

%: %.cpp Makefile
	$(GCC) -O3 $< -o $@ -lfann

%_fixed: %.c Makefile
	$(GCC) -O3 -DFIXEDFANN $< -o $@ -lfixedfann

clean:
	rm -f $(TARGETS) xor_fixed.data *.net *~ *.obj *.exe *.tds noscale.txt withscale.txt scale_test_results.txt