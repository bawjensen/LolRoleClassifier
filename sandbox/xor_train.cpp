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

// #include <stdio.h>
#include <cstdio>
#include <cstdlib>
#include <string>

#include "fann.h"

const char* dataFilePath = "../data-output/train-data.tsv";

// int FANN_API test_callback(struct fann *ann, struct fann_train_data *train,
//  unsigned int max_epochs, unsigned int epochs_between_reports, 
//  float desired_error, unsigned int epochs)
// {
//  printf("Epochs     %8d. MSE: %.5f. Desired-MSE: %.5f\n", epochs, fann_get_MSE(ann), desired_error);
//  return 0;
// }

int main(int argc, char** argv) {
    printf("Number of arguments: %i\n", argc);

    unsigned int num_layers = 3;
    const unsigned int num_input = 80;
    const unsigned int num_neurons_hidden = 50;
    const unsigned int num_output = 5;
    // const float desired_error = (const float) 0.075;
    const float desired_error = (const float) 0.015;
    const unsigned int max_epochs = 10000;
    const unsigned int epochs_between_reports = 100;
    unsigned int* layers;

    if (argc > 1) {
        if (argc == 2) { // Only supplied num_input
            num_layers = 3;
            layers = new unsigned int[num_layers];
            layers[0] = strtol(argv[1], NULL, 10);
            layers[1] = num_neurons_hidden;
            layers[2] = num_output;
        }
        else if (argc >= 3) { // Supplied num_input and num_neurons_hidden+
            num_layers = argc;
            layers = new unsigned int[num_layers];
            for (unsigned int i = 0, length = argc-1; i < length; ++i) {
                layers[i] = strtol(argv[i+1], NULL, 10);
            }
            layers[argc-1] = num_output;
        }
    }
    else {
        layers = new unsigned int[num_layers];
        layers[0] = num_input;
        layers[1] = num_neurons_hidden;
        layers[2] = num_output;
    }

    for (int i = 0, l = num_layers; i < l; ++i) {
        printf("Layer %i: %i\n", i, layers[i]);
    }

    fann_type *calc_out;

    struct fann *ann;
    struct fann_train_data *data;

    printf("Creating network.\n");
    ann = fann_create_standard_array(num_layers, layers);

    data = fann_read_train_from_file(dataFilePath);

    fann_set_activation_steepness_hidden(ann, 0.5f);
    // fann_set_activation_steepness_output(ann, 0.5f); // Useless for FANN_LINEAR

    fann_set_activation_function_hidden(ann, FANN_SIGMOID_SYMMETRIC);
    // fann_set_activation_function_output(ann, FANN_SIGMOID_SYMMETRIC);
    fann_set_activation_function_output(ann, FANN_LINEAR);

    fann_set_train_stop_function(ann, FANN_STOPFUNC_MSE);
    // fann_set_train_stop_function(ann, FANN_STOPFUNC_BIT);
    // fann_set_bit_fail_limit(ann, 0.01f);

    // fann_set_training_algorithm(ann, FANN_TRAIN_INCREMENTAL);
    // fann_set_training_algorithm(ann, FANN_TRAIN_BATCH);
    fann_set_training_algorithm(ann, FANN_TRAIN_RPROP);
    // fann_set_training_algorithm(ann, FANN_TRAIN_QUICKPROP);

    fann_init_weights(ann, data);
    
    printf("Training network.\n");
    fann_train_on_data(ann, data, max_epochs, epochs_between_reports, desired_error);

    printf("Saving network.\n");

    fann_save(ann, "xor_float.net");

    printf("Cleaning up.\n");
    fann_destroy_train(data);
    fann_destroy(ann);

    return 0;
}
