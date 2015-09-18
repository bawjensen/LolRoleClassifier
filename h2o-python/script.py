import h2o

h2o.init()

df = h2o.import_file('data/titanic.csv')

df['pclass'] = df['pclass'].asfactor()
df['survived'] = df['survived'].asfactor()

model = h2o.gbm(y = 'survived',
                x = ['pclass', 'sex', 'age', 'fare'],
                training_frame = df,
                model_id = 'MyModel')

h2o.download_pojo(model, path = 'tmp')