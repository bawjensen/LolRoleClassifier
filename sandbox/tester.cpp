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

    ann = fann_create_from_file("trained.net");

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

        printf("XOR test (%i) -> %.0f %.0f %.0f %.0f %.0f %.0f\n         %f vs %f - ",
               i,
               data->input[i][0], data->input[i][1], data->input[i][2], data->input[i][3], data->input[i][4], data->input[i][5], 
               calc_out[0],
               data->output[i][0]);

        if ( round(calc_out[0]) == data->output[i][0] ) {
            printf("Good");
            ++numGood;
        }
        else {
            printf("Bad");
            ++numBad;
        }

        printf("\n");
    }

    printf("numGood: %i, numBad: %i, %%: %f\n", numGood, numBad, numGood / (float)(numGood + numBad));

    printf("Cleaning up.\n");
    fann_destroy_train(data);
    fann_destroy(ann);

    return ret;
}
