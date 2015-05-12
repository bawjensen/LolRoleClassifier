/*
Fast Artificial Neural Network Library (fann)
Copyright (C) 2003-2012 Steffen Nissen (sn@leenissen.dk)

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this library; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
*/

#include <stdio.h>

#include "fann.h"

const char* dataFilePath = "../data-output/train-data.tsv";

int main()
{
    fann_type *calc_out;
    unsigned int i;
    int ret = 0;
    int numGood = 0,
        numBad = 0;

    struct fann *ann;
    struct fann_train_data *data;

    printf("Creating network.\n");

    ann = fann_create_from_file("xor_float.net");

    if(!ann)
    {
        printf("Error creating ann --- ABORTING.\n");
        return -1;
    }

    fann_print_connections(ann);
    fann_print_parameters(ann);

    printf("Testing network.\n");

    data = fann_read_train_from_file(dataFilePath);

    for(i = 0; i < fann_length_train_data(data); i++)
    {
        fann_reset_MSE(ann);

        calc_out = fann_test(ann, data->input[i], data->output[i]);

        printf("XOR test (%i) -> %f %f %f %f %f,\n        should be %f %f %f %f %f\n                  ",
               i,
               calc_out[0], calc_out[1], calc_out[2], calc_out[3], calc_out[4],
               data->output[i][0], data->output[i][1], data->output[i][2], data->output[i][3], data->output[i][4]);

        for (unsigned int j = 0; j < 25; ++j) {
            if ( (round(calc_out[j] * 4) / 4.0f) == data->output[i][j] ) {
                // printf("Good     ");
                ++numGood;
            }
            else {
                // printf("Bad      ");
                ++numBad;
            }
        }

        printf("\n");
    }

    printf("numGood: %i, numBad: %i, %%: %f\n", numGood, numBad, numGood / (float)(numGood + numBad));

    printf("Cleaning up.\n");
    fann_destroy_train(data);
    fann_destroy(ann);

    return ret;
}
