import os
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

from src.utils import xes_to_df
from functools import reduce
import src.const as cn

def get_plot(measure, df):    
    if measure == cn.SPACE:
        return get_space_plot(df)
    elif measure == cn.TIME:
        return ''
    elif measure == cn.COMM:
        return get_communication_graph(df)
    elif measure == cn.BATTERY:
        return get_battery_plot(df)


def _get_axis_range(df, column, default_max):
    max_value = df[column].max()

    if pd.isna(max_value):
        max_value = default_max

    return [0, max(default_max, max_value)]

def get_space_plot(df, activity_name = None):
    plot_list = []
    out_file_3d = "space_plot_3d.html"
    out_file_heat = "space_plot_heat.html"
    
    if activity_name != None:
        filtered_df = df[df[cn.ACTIVITY] == activity_name]
        range_x = _get_axis_range(filtered_df, 'x', 10)
        range_y = _get_axis_range(filtered_df, 'y', 10)
        range_z = _get_axis_range(filtered_df, 'z', 2)
        
        fig = px.scatter_3d(filtered_df, x='x', y='y', z='z',
                            color=cn.CASE,
                            symbol=cn.ACTIVITY,
                            title="Space Occupancy for: " + activity_name,
                            range_x=range_x,
                            range_y=range_y,
                            range_z=range_z,
                            )
        # Create the heatmap
        '''
        fig_heatmap = px.density_heatmap(
            df,
            x='x',
            y='y',
            title="Space for MRS - Heatmap",
            color_continuous_scale="Viridis",
            hover_data={cn.RESOURCE: True},
            range_x=[0, 10],
            range_y=[0, 10]
        )'''
    else:
        activity_name = 'home'
        if df[cn.RESOURCE].unique().size == 1:
            this_symbol = cn.ACTIVITY
        else:  
            this_symbol = cn.RESOURCE
        range_x = _get_axis_range(df, 'x', 10)
        range_y = _get_axis_range(df, 'y', 10)
        range_z = _get_axis_range(df, 'z', 2)
        fig = px.scatter_3d(df, x='x', y='y', z='z',
                            color=cn.ACTIVITY,
                            symbol=this_symbol,
                            title="Space Occupancy",
                            range_x=range_x,
                            range_y=range_y,
                            range_z=range_z,
                            )
        '''
        # Create the heatmap
        fig_heatmap = px.density_heatmap(
            df,
            x='x',
            y='y',
            title="Space for MRS - Heatmap",
            color_continuous_scale="Viridis",
            range_x=[0, 10],
            range_y=[0, 10]
        )'''

        
    
    fig.update_layout(scene=dict(
        yaxis=dict(
            backgroundcolor="rgb(227, 227, 250)",
            gridcolor="white",
            showbackground=True,
            zerolinecolor="white"),
        zaxis=dict(
            backgroundcolor="rgb(227, 227, 227)",
            gridcolor="white",
            showbackground=True,
            zerolinecolor="white",),),
    )
        
    
   
    plot_path =  os.path.join(os.getcwd(), "templates", activity_name)
    if not os.path.exists(plot_path):
        os.makedirs(plot_path)
        
    fig_path_3d = os.path.join(plot_path, out_file_3d)
    #fig_path_heat = os.path.join(plot_path, out_file_heat)
    
    
    fig.write_html(fig_path_3d)
    #fig_heatmap.write_html(fig_path_heat)
    
    plot_list.append(activity_name + '/' + out_file_3d)
    #plot_list.append(activity_name + '/' + out_file_heat)
    
    return plot_list



def get_battery_plot(df):
    template_path = []
    plot_path =  os.path.join(os.getcwd(), "templates", 'home')
    
    # Create time plot
    out_file = "time_battery_plot.html"
    fig_time = px.line(df, 
                x=cn.TIMESTAMP, 
                y=cn.BATTERY, 
                color=cn.RESOURCE,
                hover_data={cn.ACTIVITY : True},
                animation_frame=cn.CASE,
                animation_group=cn.TIMESTAMP,
                title='Energy Consumption')
    
    fig_path = os.path.join(plot_path, out_file)
    
    fig_time.write_html(fig_path)
    
    t_path = 'home/' + out_file
    template_path.append(t_path)

    '''
    # Create activity plot
    #df = df.sort_values(by=[cn.CASE, cn.ACTIVITY, cn.TIMESTAMP]).reset_index()
    
    df.sort_values([cn.CASE, cn.RESOURCE, cn.ACTIVITY, cn.TIMESTAMP], inplace=True)

    energy_consumption_records = []

    # Go through each case-resource-activity combination
    for (case, resource, activity), group in df.groupby([cn.CASE, cn.RESOURCE, cn.ACTIVITY]):
        start_event = None

        # Loop through events within this group
        for _, row in group.iterrows():
            if row['lifecycle:transition'] == 'start':
                start_event = row
            elif row['lifecycle:transition'] == 'complete' and start_event is not None:
                # Calculate battery consumption from start to complete
                consumption = start_event['battery'] - row['battery']
                energy_consumption_records.append({
                    'case:concept:name': case,
                    'org:resource': resource,
                    'concept:name': activity,
                    'energy_consumption': consumption
                })
                start_event = None

    # Convert results to a DataFrame
    result_df = pd.DataFrame(energy_consumption_records)

    # Group and sum battery consumption per case-resource-activity
    final_result = result_df.groupby([cn.CASE, cn.RESOURCE, cn.ACTIVITY]).agg(
        total_energy_consumption=('energy_consumption', 'sum')
    ).reset_index()
    
    final_result.to_csv('final_result.csv')
     
    mean_activity_depletion = final_result.groupby([cn.ACTIVITY, cn.RESOURCE])['total_energy_consumption'].mean().reset_index()
            
    fig = px.bar(
        mean_activity_depletion,
        x=cn.ACTIVITY,
        y='total_energy_consumption',
        color=cn.RESOURCE,
        facet_col=cn.RESOURCE,
        title="Mean Energy Consumption per Activity by Resource",
        labels={'battery_depletion': 'Mean Energy Consumption (%)', cn.ACTIVITY: 'Activity'},
    )
    fig.update_layout(
        yaxis_title="Mean Battery Depletion (%)",
        xaxis_title="Activity",
    )

    out_file = "activity_battery_plot.html"
    
    fig_path = os.path.join(plot_path, out_file)
    fig.write_html(fig_path)
    
    a_path = 'home/' + out_file

    template_path.append(a_path)
    '''
    
    return template_path


def get_communication_graph(this_df):
    template_path = []
    df = pd.DataFrame(generate_comm_data(this_df))
    # Assuming 'start_time' and 'complete_time' are in string format, convert them to datetime
    df['start_time'] = pd.to_datetime(df['start_time'])
    df['complete_time'] = pd.to_datetime(df['complete_time'])

    # Calculate performance metrics
    df['duration'] = df['complete_time'] - df['start_time']
    df['success_rate'] = 1 - (df['lost_msgs'] / df['attempts'])

    print(df['attempts'].mean())

    # Calculate duration
    df['duration'] = (df['complete_time'] - df['start_time']).dt.total_seconds()
    
    #df[cn.ACTIVITY] = [x[0] for x in df[cn.ACTIVITY]]
    
    df = df.drop(df[df[cn.ACTIVITY] == 'takeoff'].index)
    
    activities_counts = df[cn.ACTIVITY].value_counts().reset_index()
    activities_counts.columns = [cn.ACTIVITY, 'received_msgs']

    # Grouping data by activities and calculating sum of messages sent, lost, and total duration
    grouped_data = df.groupby(cn.ACTIVITY).agg({'msg_id': 'count', 'lost_msgs': 'sum', 'duration': 'mean', 'attempts': 'mean'}).reset_index()


    # Merge the counts of rows for each activities into the grouped data DataFrame
    grouped_data = pd.merge(grouped_data, activities_counts, on=cn.ACTIVITY)
    
    fig = px.bar(grouped_data, x=cn.ACTIVITY, y=["received_msgs", "lost_msgs"], text_auto=True)

    fig.update_layout(xaxis_title=cn.ACTIVITY, yaxis_title="Messages Count",
                    title="Communication Metrics")


    out_file = cn.COMM + "_plot.html"
    
    plot_path =  os.path.join(os.getcwd(), "templates", "home")
    if not os.path.exists(plot_path):
        os.makedirs(plot_path)
    fig_path = os.path.join(plot_path, out_file)
    
    fig.write_html(fig_path)
    
    fig_path = "home" + '/' + out_file
    template_path.append(fig_path)
    print(template_path)
    return(template_path)


def generate_comm_data(df : pd.DataFrame):
    
    grouped_df = df.groupby('msg_id')
    lost_msgs = 0
    tentativi = 0
    results = []
    # Iterate over each group and store it in the dictionary
    for msg_id, group in grouped_df:
        lost_msgs = 0
        tentativi = 0
        activity = group[cn.ACTIVITY].iloc[0]
        receive_rows = group[group['msg_role'] == 'receive']
        
            
        # Find the first row with 'lifecycle' equal to 'start'
        start_rows = group[(group[cn.LIFECYCLE] == 'start')]
        if not start_rows.empty:
            start_row = start_rows.iloc[0]
            tentativi = len(start_rows)
            if receive_rows.empty:
                lost_msgs += 1
        else:
            continue
        
        # Find the last row with 'lifecycle' equal to 'complete'
        complete_rows = group[(group[cn.LIFECYCLE] == 'complete')]
        if not complete_rows.empty:
            complete_row = complete_rows.iloc[-1]
        else:
            continue
        
        # Calculate timestamp difference
        timestamp_diff = pd.to_datetime(complete_row[cn.TIMESTAMP]) - pd.to_datetime(start_row[cn.TIMESTAMP])
        
        # Store results
        results.append({
            'msg_id': msg_id,
            cn.ACTIVITY: activity,
            'start_time': start_row[cn.TIMESTAMP],
            'complete_time': complete_row[cn.TIMESTAMP],
            'timestamp_diff': timestamp_diff,
            'lost_msgs': lost_msgs,
            'attempts': tentativi
        })
        # Store both send and receive rows in a dictionary


    dff = pd.DataFrame(results)

    return dff
